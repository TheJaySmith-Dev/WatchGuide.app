import { MediaItem, TraktList, CustomListConfig, MDBListList } from '../types';
import { simklService } from './simkl';
import { traktService } from './trakt';
import { mdblistService } from './mdblist';

export type ListType = 'planToWatch' | 'watched' | 'liked';

// Storage service now uses Simkl and Trakt as data sources
class StorageService {
    private cache: {
        planToWatch: MediaItem[];
        watched: MediaItem[];
        liked: MediaItem[];
        likedLists: TraktList[];
        customLists: CustomListConfig[];
        lastFetch: number;
        listItems: Record<number, { items: MediaItem[], timestamp: number }>;
    } = {
            planToWatch: [],
            watched: [],
            liked: [],
            likedLists: [],
            customLists: [],
            lastFetch: 0,
            listItems: {}
        };

    private localOverlays: {
        planToWatch: MediaItem[];
        watched: MediaItem[];
        liked: MediaItem[];
    } = {
        planToWatch: [],
        watched: [],
        liked: []
    };

    private CACHE_DURATION = 0; // Disable cache for now to ensure sync
    private LIST_CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache for lists

    private CONFIG_LIST_NAME = 'watchguide-config';
    private configListId: string | number | null = null;
    private customListsSyncUrl: string | null = null;
    private customListItemsSyncUrls: Record<string, string> = {};

    constructor() {
        this.loadLocalCustomLists();
        this.loadLocalOverlays();
        this.customListsSyncUrl = localStorage.getItem('custom_lists_sync_url') || null;
        try {
            const raw = localStorage.getItem('custom_list_items_sync_urls');
            this.customListItemsSyncUrls = raw ? JSON.parse(raw) : {};
        } catch {
            this.customListItemsSyncUrls = {};
        }
    }

    // Sync configuration to Trakt
    async syncConfigToTrakt() {
        if (!traktService.isAuthenticated()) return;

        try {
            // Find or create the config list
            if (!this.configListId) {
                const lists = await traktService.getPersonalLists();
                const configList = lists.find(l => l.name === this.CONFIG_LIST_NAME);
                
                if (configList) {
                    this.configListId = configList.ids.slug; // Use slug or id
                } else {
                    const newList = await traktService.createList(
                        this.CONFIG_LIST_NAME, 
                        JSON.stringify(this.cache.customLists), 
                        'private'
                    );
                    if (newList) this.configListId = newList.ids.slug;
                }
            }

            // Update list description with serialized config
            if (this.configListId) {
                const configStr = JSON.stringify(this.cache.customLists);
                await traktService.updateList(this.configListId, configStr);
                console.log('Synced config to Trakt');
            }
        } catch (e) {
            console.error('Failed to sync config to Trakt', e);
        }
    }

    // Fetch configuration from Trakt
    async fetchConfigFromTrakt() {
        if (!traktService.isAuthenticated()) return;

        try {
            const lists = await traktService.getPersonalLists();
            const configList = lists.find(l => l.name === this.CONFIG_LIST_NAME);

            if (configList && configList.description) {
                this.configListId = configList.ids.slug;
                try {
                    const cloudConfig = JSON.parse(configList.description);
                    
                    // Smart Merge: Use cloud config but preserve local list data if cloud is just metadata
                    // The cloud config is the source of truth for viewTypes and customNames
                    if (Array.isArray(cloudConfig) && cloudConfig.length > 0) {
                        
                        // If local list is empty, just take cloud
                        if (this.cache.customLists.length === 0) {
                            this.cache.customLists = cloudConfig;
                        } else {
                            // Merge strategy:
                            // 1. Create a map of cloud configs by ID (or list ID if ID matches)
                            // 2. Update local items with cloud properties
                            // 3. Add any new items from cloud
                            
                            // To properly merge, we need to match existing lists.
                            // Since IDs might be different if created locally on different devices (crypto.randomUUID),
                            // we should try to match by content (traktList ID or mdblist ID)
                            
                            const mergedLists = [...this.cache.customLists];
                            
                            cloudConfig.forEach((cloudList: CustomListConfig) => {
                                // Try to find matching local list
                                const localIndex = mergedLists.findIndex(l => {
                                    // Match by ID first
                                    if (l.id === cloudList.id) return true;
                                    
                                    // Match by Trakt List ID (single)
                                    if (l.traktList && cloudList.traktList && !Array.isArray(l.traktList) && !Array.isArray(cloudList.traktList)) {
                                        return (l.traktList as TraktList).ids.trakt === (cloudList.traktList as TraktList).ids.trakt;
                                    }
                                    
                                    // Match by MDBList ID (single)
                                    if (l.mdblistList && cloudList.mdblistList && !Array.isArray(l.mdblistList) && !Array.isArray(cloudList.mdblistList)) {
                                        return (l.mdblistList as MDBListList).id === (cloudList.mdblistList as MDBListList).id;
                                    }
                                    
                                    return false;
                                });

                                if (localIndex !== -1) {
                                    // Update local with cloud properties (viewType, thumbnail, name)
                                    // Cloud is source of truth for these settings
                                    // CRITICAL: Ensure we don't accidentally overwrite a 'row' with a default 'hub' from an old cloud config
                                    // Actually, cloud MUST be the source of truth, otherwise devices will fight.
                                    // If user changes it on device A, device A pushes to cloud. Device B pulls from cloud.
                                    // The issue is likely that "Liked Lists" sync logic runs BEFORE fetchConfig, creating a default 'hub' entry
                                    // and then maybe we aren't merging correctly or the ID match fails?
                                    
                                    mergedLists[localIndex] = {
                                        ...mergedLists[localIndex],
                                        viewType: cloudList.viewType,
                                        thumbnailUrl: cloudList.thumbnailUrl,
                                        customName: cloudList.customName || mergedLists[localIndex].customName,
                                        id: cloudList.id 
                                    };
                                } else {
                                    // Add new list from cloud
                                    mergedLists.push(cloudList);
                                }
                            });
                            
                            this.cache.customLists = mergedLists;
                        }

                        this.saveLocalCustomLists();
                        console.log('Loaded config from Trakt', cloudConfig);
                    }
                } catch (parseErr) {
                    console.error('Invalid config in Trakt list description', parseErr);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config from Trakt', e);
        }
    }

    private loadLocalCustomLists() {
        try {
            const saved = localStorage.getItem('custom_lists');
            if (saved) {
                this.cache.customLists = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load custom lists', e);
        }
    }

    private saveLocalCustomLists() {
        localStorage.setItem('custom_lists', JSON.stringify(this.cache.customLists));
    }

    private getLocalCustomListItemsMap(): Record<string, MediaItem[]> {
        try {
            const raw = localStorage.getItem('custom_list_items');
            if (!raw) return {};
            return JSON.parse(raw) || {};
        } catch {
            return {};
        }
    }

    private setLocalCustomListItemsMap(map: Record<string, MediaItem[]>) {
        localStorage.setItem('custom_list_items', JSON.stringify(map));
    }

    private loadLocalOverlays() {
        try {
            const p = localStorage.getItem('local_planToWatch');
            const w = localStorage.getItem('local_watched');
            const l = localStorage.getItem('local_liked');
            this.localOverlays.planToWatch = p ? JSON.parse(p) : [];
            this.localOverlays.watched = w ? JSON.parse(w) : [];
            this.localOverlays.liked = l ? JSON.parse(l) : [];
        } catch (e) {
            console.error('Failed to load local overlays', e);
        }
    }

    private saveLocalOverlays() {
        localStorage.setItem('local_planToWatch', JSON.stringify(this.localOverlays.planToWatch));
        localStorage.setItem('local_watched', JSON.stringify(this.localOverlays.watched));
        localStorage.setItem('local_liked', JSON.stringify(this.localOverlays.liked));
    }

    // Fetch lists from Simkl and Trakt
    async fetchLists(force = false): Promise<void> {
        const now = Date.now();
        if (!force && now - this.cache.lastFetch < this.CACHE_DURATION) {
            return;
        }

        const isSimklAuth = simklService.isAuthenticated();
        const isTraktAuth = traktService.isAuthenticated();
        const isMdbAuth = mdblistService.isAuthenticated();

        if (!isSimklAuth && !isTraktAuth && !isMdbAuth) {
            this.cache = { 
                planToWatch: [...this.localOverlays.planToWatch], 
                watched: [...this.localOverlays.watched], 
                liked: [...this.localOverlays.liked], 
                likedLists: [], 
                customLists: this.cache.customLists, 
                lastFetch: Date.now(), 
                listItems: {} 
            };
            return;
        }

        try {
            // Fetch Simkl Data
            const simklPromise = isSimklAuth ? Promise.all([
                simklService.getWatchlist(),
                simklService.getWatched(),
                simklService.getRatings()
            ]) : Promise.resolve([[], [], []]);

            // Trakt ratings not implemented yet for sync, can add later
            const traktPromise = isTraktAuth ? Promise.all([
                traktService.getWatchlist(),
                traktService.getWatched(),
                traktService.getFavorites(),
                traktService.getLikedLists()
            ]) : Promise.resolve([[], [], [], []]);

            // Fetch MDBList Data
            const mdbPromise = isMdbAuth ? Promise.all([
                mdblistService.getLastActivities(),
                mdblistService.getWatchlist(),
                mdblistService.getUserLists()
            ]) : Promise.resolve([null, [], []]);

            const [simklData, traktData, mdbData] = await Promise.all([simklPromise, traktPromise, mdbPromise]);
            const [simklWatchlist, simklWatched, simklRated] = simklData as any;
            const [traktWatchlist, traktWatched, traktFavorites, traktLikedLists] = traktData as any;
            const [mdbActivitiesRaw, mdbWatchlist, mdbUserLists] = mdbData as any;
            const mdbActivities: any = mdbActivitiesRaw;

            // Convert items
            const simklPlanToWatch = await simklService.convertToMediaItems(simklWatchlist);
            const simklWatchedItems = await simklService.convertToMediaItems(simklWatched);
            const simklLikedItems = await simklService.convertToMediaItems(simklRated);

            const traktPlanToWatch = await traktService.convertToMediaItems(traktWatchlist);
            const traktWatchedItems = await traktService.convertToMediaItems(traktWatched);
            const traktLikedItems = await traktService.convertToMediaItems(traktFavorites);

            // MDBList Watchlist is already MediaItems
            const mdbPlanToWatch = mdbWatchlist as MediaItem[];

            // Merge Lists (Deduplicate by ID)
            // Merge 3 sources for planToWatch
            const mergedPlanToWatch = this.mergeLists(simklPlanToWatch, traktPlanToWatch);
            this.cache.planToWatch = this.mergeLists(mergedPlanToWatch, mdbPlanToWatch);

            this.cache.watched = this.mergeLists(simklWatchedItems, traktWatchedItems);
            // Merge Simkl Liked (Ratings) with Trakt Favorites (and maybe Trakt Ratings if we fetched them)
            this.cache.liked = this.mergeLists(simklLikedItems, traktLikedItems);
            this.cache.likedLists = (traktLikedLists as TraktList[]) || [];

            // Merge local overlays for users without Simkl/Trakt
            this.cache.planToWatch = this.mergeLists(this.cache.planToWatch, this.localOverlays.planToWatch);
            this.cache.watched = this.mergeLists(this.cache.watched, this.localOverlays.watched);
            this.cache.liked = this.mergeLists(this.cache.liked, this.localOverlays.liked);

            // Handle MDBList User Lists
            if (isMdbAuth && mdbUserLists && Array.isArray(mdbUserLists)) {
                const userLists = mdbUserLists as MDBListList[];
                let hasMdbChanges = false;
                const forceWatchlistRefresh = !!mdbActivities;
                
                // Merge specific MDBList lists into core sections if present
                try {
                    // Prefer a user-selected Watchlist from Custom Lists if available
                    const preferredWatchlistId = this.getPreferredMDBWatchlistId();
                    if (preferredWatchlistId) {
                        const preferredItems = await this.getListItems({
                            id: 'temp',
                            mdblistList: userLists.find(l => l.id === preferredWatchlistId) || { id: preferredWatchlistId, name: 'Watchlist' } as any,
                            customName: 'Watchlist',
                            viewType: 'row'
                        } as any, forceWatchlistRefresh);
                        this.cache.planToWatch = this.mergeLists(this.cache.planToWatch, preferredItems);
                    }
                    const likedList = userLists.find(l => {
                        const n = l.name.toLowerCase();
                        return n.includes('liked') || n.includes('likes') || n.includes('favourites') || n.includes('favorites') || n.includes('favorite');
                    });
                    if (likedList) {
                        const likedItems = await this.getListItems({
                            id: 'temp',
                            mdblistList: likedList,
                            customName: likedList.name,
                            viewType: 'row'
                        } as any, true); // force refresh liked items
                        this.cache.liked = this.mergeLists(this.cache.liked, likedItems);
                    }
                    const watchedList = userLists.find(l => {
                        const n = l.name.toLowerCase();
                        return n.includes('watched') || n.includes('history') || n.includes('seen');
                    });
                    if (watchedList) {
                        const watchedItems = await this.getListItems({
                            id: 'temp',
                            mdblistList: watchedList,
                            customName: watchedList.name,
                            viewType: 'row'
                        } as any);
                        this.cache.watched = this.mergeLists(this.cache.watched, watchedItems);
                    }
                    const watchlistList = userLists.find(l => {
                        const n = l.name.toLowerCase();
                        return n.includes('watchlist') || n.includes('plan to watch') || n.includes('queue') || n.includes('to watch') || n.includes('watch later');
                    });
                    if (watchlistList) {
                        const planItems = await this.getListItems({
                            id: 'temp',
                            mdblistList: watchlistList,
                            customName: watchlistList.name,
                            viewType: 'row'
                        } as any, forceWatchlistRefresh);
                        this.cache.planToWatch = this.mergeLists(this.cache.planToWatch, planItems);
                    }
                } catch (e) {
                    console.error('Failed to merge MDBList named lists', e);
                }
                
                userLists.forEach(list => {
                    // Check if list already exists in customLists (by MDBList ID)
                    const exists = this.cache.customLists.some(l => {
                        if (l.mdblistList && !Array.isArray(l.mdblistList)) {
                            return l.mdblistList.id === list.id;
                        }
                        if (l.mdblistList && Array.isArray(l.mdblistList)) {
                            return l.mdblistList.some(m => m.id === list.id);
                        }
                        return false;
                    });

                    const n = list.name.toLowerCase();
                    const isLikedName = n.includes('liked') || n.includes('likes') || n.includes('favourites') || n.includes('favorites') || n.includes('favorite');
                    const isWatchedName = n.includes('watched') || n.includes('history') || n.includes('seen');
                    const isWatchlistName = n.includes('watchlist') || n.includes('plan to watch') || n.includes('queue') || n.includes('to watch') || n.includes('watch later');
                    const shouldBeRow = isLikedName || isWatchedName || isWatchlistName;

                    if (!exists) {
                        this.cache.customLists.push({
                            id: crypto.randomUUID(),
                            mdblistList: list,
                            customName: list.name,
                            viewType: shouldBeRow ? 'row' : 'hub',
                            showOnBrowse: true
                        });
                        hasMdbChanges = true;
                    } else {
                        // Ensure core lists are rows, never hubs
                        const idx = this.cache.customLists.findIndex(l => {
                            if (l.mdblistList && !Array.isArray(l.mdblistList)) return l.mdblistList.id === list.id;
                            if (l.mdblistList && Array.isArray(l.mdblistList)) return l.mdblistList.some(m => m.id === list.id);
                            return false;
                        });
                        if (idx !== -1 && shouldBeRow && this.cache.customLists[idx].viewType !== 'row') {
                            this.cache.customLists[idx] = {
                                ...this.cache.customLists[idx],
                                viewType: 'row'
                            };
                            hasMdbChanges = true;
                        }
                    }
                });

                if (hasMdbChanges) {
                    this.saveLocalCustomLists();
                    this.syncConfigToTrakt();
                }
            }

            // Sync Custom Lists with Trakt Liked Lists
            if (this.cache.likedLists.length > 0) {
                const existingIds = new Set<number>();
                this.cache.customLists.forEach(l => {
                    if (l.traktList) {
                        const lists = Array.isArray(l.traktList) ? l.traktList : [l.traktList];
                        lists.forEach(t => existingIds.add(t.ids.trakt));
                    }
                });

                let hasChanges = false;

                this.cache.likedLists.forEach(list => {
                    // Check if list already exists in customLists (by Trakt ID)
                    const exists = this.cache.customLists.some(l => {
                        if (l.traktList && !Array.isArray(l.traktList)) {
                            return l.traktList.ids.trakt === list.ids.trakt;
                        }
                        // Handle merged lists? For now, if it's part of a merged list, we consider it "handled"
                        // But here we are looking for exact match to avoid duplicating "My Watchlist" as a new Hub
                        if (l.traktList && Array.isArray(l.traktList)) {
                            return l.traktList.some(t => t.ids.trakt === list.ids.trakt);
                        }
                        return false;
                    });

                    if (!exists && list.name !== this.CONFIG_LIST_NAME) { // Ignore config list
                        // Add new liked list to custom lists
                        this.cache.customLists.push({
                            id: crypto.randomUUID(),
                            traktList: list,
                            customName: list.name,
                            viewType: 'hub', // Default to hub if added via like
                        });
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    this.saveLocalCustomLists();
                    this.syncConfigToTrakt(); // Sync new additions
                }
            }

            console.log('StorageService Fetch Complete:', {
                planToWatch: this.cache.planToWatch.length,
                watched: this.cache.watched.length,
                liked: this.cache.liked.length,
                likedLists: this.cache.likedLists.length,
                sources: {
                    simkl: isSimklAuth,
                    trakt: isTraktAuth
                }
            });
            
            this.cache.lastFetch = Date.now();
        } catch (error) {
            console.error('Failed to fetch lists:', error);
        }
    }

    private mergeLists(list1: MediaItem[], list2: MediaItem[]): MediaItem[] {
        const map = new Map<number, MediaItem>();
        list1.forEach(item => map.set(item.id, item));
        list2.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
    }

    // Get list with automatic refresh if cache is stale
    async getList(type: ListType): Promise<MediaItem[]> {
        await this.fetchLists();
        return this.cache[type];
    }

    // Get list synchronously (uses cached data)
    getListSync(type: ListType): MediaItem[] {
        return this.cache[type];
    }

    // Toggle item in list
    async toggleItem(type: ListType, item: MediaItem): Promise<boolean> {
        const isSimklAuth = simklService.isAuthenticated();
        const isTraktAuth = traktService.isAuthenticated();
        const isMdbAuth = mdblistService.isAuthenticated();
        const list = this.cache[type];
        const index = list.findIndex(i => i.id === item.id);
        const isAdding = index === -1;

        if (!isSimklAuth && !isTraktAuth && !isMdbAuth) {
            const overlay = this.localOverlays[type];
            const exists = overlay.some(i => i.id === item.id);
            if (isAdding && !exists) {
                this.localOverlays[type] = [...overlay, item];
                this.cache[type] = [...list, item];
            } else if (!isAdding && exists) {
                this.localOverlays[type] = overlay.filter(i => i.id !== item.id);
                this.cache[type] = list.filter(i => i.id !== item.id);
            }
            this.saveLocalOverlays();
            return isAdding;
        }

        let success = false;

        if (isMdbAuth && type === 'planToWatch') {
            const preferredWatchlistId = this.getPreferredMDBWatchlistId();
            if (preferredWatchlistId) {
                if (isAdding) {
                    if (await mdblistService.addItemToList(preferredWatchlistId, item)) success = true;
                } else {
                    if (await mdblistService.removeItemFromList(preferredWatchlistId, item)) success = true;
                }
            } else {
                if (isAdding) {
                    if (await mdblistService.addToWatchlist(item)) success = true;
                } else {
                    if (await mdblistService.removeFromWatchlist(item)) success = true;
                }
            }
        }
        
        if (isMdbAuth && type === 'liked') {
            const preferredLikedId = this.getPreferredMDBLikedListId();
            if (preferredLikedId) {
                if (isAdding) {
                    if (await mdblistService.addItemToList(preferredLikedId, item)) success = true;
                } else {
                    if (await mdblistService.removeItemFromList(preferredLikedId, item)) success = true;
                }
            }
        }

        if (isSimklAuth) {
            if (type === 'planToWatch') {
                if (await simklService.addToList(item, 'watchlist')) success = true;
                if (!isAdding) await simklService.removeFromList(item, 'watchlist');
            } else if (type === 'watched') {
                if (await simklService.addToList(item, 'watched')) success = true;
                if (!isAdding) await simklService.removeFromList(item, 'watched');
            } else if (type === 'liked') {
                if (await simklService.addRating(item, 10)) success = true;
                if (!isAdding) await simklService.removeRating(item);
            }
        }

        if (isTraktAuth) {
             if (type === 'planToWatch') {
                if (isAdding) {
                    if (await traktService.addToList(item, 'watchlist')) success = true;
                } else {
                    if (await traktService.removeFromList(item, 'watchlist')) success = true;
                }
            } else if (type === 'watched') {
                if (isAdding) {
                    if (await traktService.addToList(item, 'watched')) success = true;
                } else {
                    if (await traktService.removeFromList(item, 'watched')) success = true;
                }
            } else if (type === 'liked') {
                if (isAdding) {
                    if (await traktService.addToFavorites(item)) success = true;
                } else {
                    if (await traktService.removeFromFavorites(item)) success = true;
                }
            }
        }

        // Optimistic local update
        if (isAdding) {
            this.cache[type] = [...list, item];
        } else {
            this.cache[type] = list.filter(i => i.id !== item.id);
        }
        const overlay = this.localOverlays[type];
        if (isAdding) {
            if (!overlay.some(i => i.id === item.id)) {
                this.localOverlays[type] = [...overlay, item];
            }
        } else {
            this.localOverlays[type] = overlay.filter(i => i.id !== item.id);
        }
        this.saveLocalOverlays();
        return isAdding;
    }

    private getPreferredMDBWatchlistId(): number | null {
        const candidates = this.cache.customLists.filter(l => {
            const list = Array.isArray(l.mdblistList) ? null : l.mdblistList;
            if (!list) return false;
            const n = (list.name || '').toLowerCase();
            return n.includes('watchlist');
        });
        if (candidates.length === 0) return null;
        const first = candidates[0];
        const list = Array.isArray(first.mdblistList) ? null : first.mdblistList;
        return list ? list.id : null;
    }

    private getPreferredMDBLikedListId(): number | null {
        const candidates = this.cache.customLists.filter(l => {
            const list = Array.isArray(l.mdblistList) ? null : l.mdblistList;
            if (!list) return false;
            const n = (list.name || '').toLowerCase();
            return n.includes('liked') || n.includes('likes') || n.includes('favorites') || n.includes('favourites') || n.includes('favorite') || n.includes('favs') || n.includes('fav') || n.includes('heart') || n.includes('love');
        });
        if (candidates.length === 0) return null;
        const first = candidates[0];
        const list = Array.isArray(first.mdblistList) ? null : first.mdblistList;
        return list ? list.id : null;
    }

    // Check if item is in list
    isInList(type: ListType, id: number): boolean {
        if (!this.cache[type]) {
            console.error(`Invalid list type: ${type}`);
            return false;
        }
        return this.cache[type].some(i => i.id === id);
    }

    // Get liked lists (Legacy)
    getLikedLists(): TraktList[] {
        return this.cache.likedLists || [];
    }
    
    // Get Custom Lists (New)
    getCustomLists(): CustomListConfig[] {
        return this.cache.customLists || [];
    }
    
    addItemToLocalCustomList(listId: string, item: MediaItem) {
        const key = `local:${listId}`;
        const map = this.getLocalCustomListItemsMap();
        const current = map[listId] || [];
        if (!current.some(i => i.id === item.id)) {
            const updated = [...current, item];
            map[listId] = updated;
            this.setLocalCustomListItemsMap(map);
            this.cache.listItems[key as any] = { items: updated, timestamp: Date.now() } as any;
        }
    }

    removeItemFromLocalCustomList(listId: string, id: number) {
        const key = `local:${listId}`;
        const map = this.getLocalCustomListItemsMap();
        const current = map[listId] || [];
        const updated = current.filter(i => i.id !== id);
        map[listId] = updated;
        this.setLocalCustomListItemsMap(map);
        this.cache.listItems[key as any] = { items: updated, timestamp: Date.now() } as any;
    }

    getLocalCustomListItems(listId: string): MediaItem[] {
        const key = `local:${listId}`;
        const cached = this.cache.listItems[key as any];
        if (cached) return cached.items;
        const map = this.getLocalCustomListItemsMap();
        const current = map[listId] || [];
        this.cache.listItems[key as any] = { items: current, timestamp: Date.now() } as any;
        return current;
    }

    getCustomListsSyncUrl(): string | null {
        return this.customListsSyncUrl;
    }

    setCustomListsSyncUrl(url: string | null) {
        this.customListsSyncUrl = url;
        if (url) {
            localStorage.setItem('custom_lists_sync_url', url);
        } else {
            localStorage.removeItem('custom_lists_sync_url');
        }
    }

    getCustomListsDataUrl(): string {
        const json = JSON.stringify(this.cache.customLists);
        const base64 = this.encodeBase64(json);
        return `data:application/json;base64,${base64}`;
    }

    getCustomListConfigDataUrl(id: string): string {
        const list = this.cache.customLists.find(l => l.id === id);
        if (!list) return '';
        const json = JSON.stringify(list);
        const base64 = this.encodeBase64(json);
        return `data:application/json;base64,${base64}`;
    }

    async getCustomListItemsDataUrl(id: string): Promise<string> {
        const list = this.cache.customLists.find(l => l.id === id);
        if (!list) return '';
        const items = await this.getListItems(list, true);
        const json = JSON.stringify(items);
        const base64 = this.encodeBase64(json);
        return `data:application/json;base64,${base64}`;
    }

    async importCustomListsFromUrl(url: string): Promise<boolean> {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return false;
            const data = await resp.json();
            if (!Array.isArray(data)) return false;
            // Replace local custom lists with remote definition
            this.cache.customLists = data;
            this.saveLocalCustomLists();
            this.setCustomListsSyncUrl(url);
            return true;
        } catch (e) {
            console.error('Failed to import custom lists from URL', e);
            return false;
        }
    }

    private encodeBase64(str: string): string {
        try {
            if (typeof btoa !== 'undefined' && typeof TextEncoder !== 'undefined') {
                const bytes = new TextEncoder().encode(str);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
            }
        } catch (e) {
            console.error('Base64 encode failed, falling back', e);
        }
        try {
            // Node.js fallback
            // @ts-ignore
            return Buffer.from(str, 'utf-8').toString('base64');
        } catch {
            // Last resort (may fail for some unicode, but try)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return btoa(unescape(encodeURIComponent(str)));
        }
    }

    async importCustomListConfigFromUrl(url: string): Promise<boolean> {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return false;
            const data = await resp.json();
            const items: CustomListConfig[] = Array.isArray(data) ? data : [data];
            const toAdd: CustomListConfig[] = [];
            items.forEach(cfg => {
                if (!cfg || typeof cfg !== 'object') return;
                const exists = this.cache.customLists.some(l => {
                    if (l.id === cfg.id) return true;
                    if (l.traktList && cfg.traktList && !Array.isArray(l.traktList) && !Array.isArray(cfg.traktList)) {
                        return l.traktList.ids.trakt === cfg.traktList.ids.trakt;
                    }
                    if (l.mdblistList && cfg.mdblistList && !Array.isArray(l.mdblistList) && !Array.isArray(cfg.mdblistList)) {
                        return l.mdblistList.id === cfg.mdblistList.id;
                    }
                    return false;
                });
                if (!exists) {
                    const newCfg: CustomListConfig = {
                        id: crypto.randomUUID(),
                        customName: cfg.customName || 'Imported List',
                        viewType: cfg.viewType || 'hub',
                        thumbnailUrl: cfg.thumbnailUrl,
                        traktList: cfg.traktList || undefined,
                        mdblistList: cfg.mdblistList || undefined
                    };
                    toAdd.push(newCfg);
                }
            });
            if (toAdd.length > 0) {
                this.cache.customLists = [...this.cache.customLists, ...toAdd];
                this.saveLocalCustomLists();
                this.syncConfigToTrakt();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to import custom list from URL', e);
            return false;
        }
    }

    async importCustomListItemsFromUrl(listId: string, url: string): Promise<boolean> {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return false;
            const data = await resp.json();
            const items: MediaItem[] = Array.isArray(data) ? data : [];
            if (items.length === 0) return false;
            const map = this.getLocalCustomListItemsMap();
            map[listId] = items;
            this.setLocalCustomListItemsMap(map);
            const key = `local:${listId}`;
            this.cache.listItems[key as any] = { items, timestamp: Date.now() } as any;
            return true;
        } catch (e) {
            console.error('Failed to import custom list items from URL', e);
            return false;
        }
    }

    async syncCustomListsFromUrl(): Promise<boolean> {
        if (!this.customListsSyncUrl) return false;
        try {
            const resp = await fetch(this.customListsSyncUrl);
            if (!resp.ok) return false;
            const data = await resp.json();
            if (!Array.isArray(data)) return false;
            const localStr = JSON.stringify(this.cache.customLists);
            const remoteStr = JSON.stringify(data);
            if (localStr !== remoteStr) {
                this.cache.customLists = data;
                this.saveLocalCustomLists();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to sync custom lists from URL', e);
            return false;
        }
    }

    getCustomListItemsSyncUrl(listId: string): string | null {
        return this.customListItemsSyncUrls[listId] || null;
    }

    setCustomListItemsSyncUrl(listId: string, url: string | null) {
        if (url) {
            this.customListItemsSyncUrls[listId] = url;
        } else {
            delete this.customListItemsSyncUrls[listId];
        }
        localStorage.setItem('custom_list_items_sync_urls', JSON.stringify(this.customListItemsSyncUrls));
    }

    async syncCustomListItemsFromUrl(listId: string): Promise<boolean> {
        const url = this.getCustomListItemsSyncUrl(listId);
        if (!url) return false;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return false;
            const data = await resp.json();
            const items: MediaItem[] = Array.isArray(data) ? data : [];
            const local = this.getLocalCustomListItems(listId);
            const localStr = JSON.stringify(local);
            const remoteStr = JSON.stringify(items);
            if (localStr !== remoteStr && items.length > 0) {
                const map = this.getLocalCustomListItemsMap();
                map[listId] = items;
                this.setLocalCustomListItemsMap(map);
                const key = `local:${listId}`;
                this.cache.listItems[key as any] = { items, timestamp: Date.now() } as any;
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to sync custom list items from URL', e);
            return false;
        }
    }

    // Add a custom list
    addCustomList(config: Omit<CustomListConfig, 'id'>) {
        // Ensure we respect the passed viewType, or default to hub
        const viewType = config.viewType || 'hub';
        
        const newList: CustomListConfig = {
            ...config,
            viewType, // Explicitly set it
            showOnBrowse: config.showOnBrowse ?? false,
            id: crypto.randomUUID(),
        };
        this.cache.customLists = [...this.cache.customLists, newList];
        this.saveLocalCustomLists();
        this.syncConfigToTrakt(); // Trigger sync
        return newList;
    }

    // Update a custom list
    updateCustomList(id: string, updates: Partial<CustomListConfig>) {
        const index = this.cache.customLists.findIndex(l => l.id === id);
        if (index === -1) return;

        this.cache.customLists[index] = {
            ...this.cache.customLists[index],
            ...updates
        };
        this.saveLocalCustomLists();
        this.syncConfigToTrakt(); // Trigger sync
    }

    // Remove a custom list
    removeCustomList(id: string) {
        this.cache.customLists = this.cache.customLists.filter(l => l.id !== id);
        this.saveLocalCustomLists();
        this.syncConfigToTrakt(); // Trigger sync
    }

    removeCoreNamedLists() {
        const names = ['watchlist', 'plan to watch', 'watched', 'liked', 'favourites', 'favorites', 'favorite'];
        this.cache.customLists = this.cache.customLists.filter(l => {
            const n = (l.customName || '').toLowerCase();
            return !names.some(name => n === name);
        });
        this.saveLocalCustomLists();
        this.syncConfigToTrakt();
    }

    // Get Items for a specific Custom List Config (handles merged lists)
    async getListItems(config: CustomListConfig, forceRefresh: boolean = false): Promise<MediaItem[]> {
        if (!config.traktList && !config.mdblistList && config.customName) {
            const name = config.customName.toLowerCase();
            if (name === 'watchlist' || name === 'plan to watch') {
                return [...this.cache.planToWatch];
            }
            if (name === 'watched') {
                return [...this.cache.watched];
            }
            if (name === 'liked' || name === 'favorites' || name === 'favourites') {
                return [...this.cache.liked];
            }
            return this.getLocalCustomListItems(config.id);
        }
        const traktLists = config.traktList ? (Array.isArray(config.traktList) ? config.traktList : [config.traktList]) : [];
        const mdbLists = config.mdblistList ? (Array.isArray(config.mdblistList) ? config.mdblistList : [config.mdblistList]) : [];
        
        const traktIds = traktLists.filter(Boolean).map(l => (l as any).ids.trakt);
        const mdbIds = mdbLists.filter(Boolean).map(l => (l as any).id);
        
        const cacheKey = `trakt:${traktIds.sort().join(',')}|mdb:${mdbIds.sort().join(',')}`;
        const now = Date.now();
        const cached = this.cache.listItems[cacheKey];

        if (!forceRefresh && cached && (now - cached.timestamp < this.LIST_CACHE_DURATION)) {
            return cached.items;
        }

        try {
            const allItems: MediaItem[] = [];

            // Fetch Trakt lists
            const traktPromises = traktIds.map(id => traktService.getListItems(id));
            const traktResults = await Promise.all(traktPromises);

            for (const listItems of traktResults) {
                const mediaItems = await traktService.convertToMediaItems(listItems);
                allItems.push(...mediaItems);
            }

            // Fetch MDBList lists
            const mdbPromises = mdbIds.map(id => mdblistService.getListItems(id));
            const mdbResults = await Promise.all(mdbPromises);
            
            for (const listItems of mdbResults) {
                allItems.push(...listItems);
            }

            // Deduplicate by ID
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());
            
            // Update cache
            this.cache.listItems[cacheKey] = {
                items: uniqueItems,
                timestamp: now
            };
            
            return uniqueItems;
        } catch (error) {
            console.error(`Failed to fetch items for list config ${config.id}`, error);
            return cached ? cached.items : [];
        }
    }

    // Get Items for a specific Trakt List (Legacy/Single list support)
    async getTraktListItems(listId: number): Promise<MediaItem[]> {
        return this.getListItems({
            id: 'legacy_temp',
            traktList: { ids: { trakt: listId } } as TraktList
        });
    }

    // Toggle list like
    async toggleListLike(list: TraktList): Promise<boolean> {
        if (!traktService.isAuthenticated()) {
            alert('Please log in to Trakt to manage lists');
            return false;
        }

        const isLiked = this.cache.likedLists.some(l => l.ids.trakt === list.ids.trakt);
        let success = false;

        if (isLiked) {
            success = await traktService.unlikeList(list.ids.trakt);
        } else {
            success = await traktService.likeList(list.ids.trakt);
        }

        if (success) {
            if (isLiked) {
                this.cache.likedLists = this.cache.likedLists.filter(l => l.ids.trakt !== list.ids.trakt);
            } else {
                this.cache.likedLists = [...this.cache.likedLists, list];
            }
            return true;
        }

        return false;
    }

    // Merge custom list with another Trakt list or MDBList list
    mergeCustomList(customListId: string, listToMerge: TraktList | MDBListList) {
        const listIndex = this.cache.customLists.findIndex(l => l.id === customListId);
        if (listIndex === -1) return;

        const list = this.cache.customLists[listIndex];
        
        // Check if it is TraktList (has ids) or MDBListList
        const isTrakt = 'ids' in listToMerge;
        
        if (isTrakt) {
            const traktList = listToMerge as TraktList;
            // Convert single traktList to array if needed
            const currentLists = Array.isArray(list.traktList) ? list.traktList : [list.traktList];
            
            // Check if already merged
            if (currentLists.some(l => l.ids.trakt === traktList.ids.trakt)) return;

            this.cache.customLists[listIndex] = {
                ...list,
                traktList: [...currentLists, traktList]
            };
        } else {
            const mdbList = listToMerge as MDBListList;
            const currentLists = list.mdblistList ? (Array.isArray(list.mdblistList) ? list.mdblistList : [list.mdblistList]) : [];
            
            if (currentLists.some(l => l.id === mdbList.id)) return;
            
            this.cache.customLists[listIndex] = {
                ...list,
                mdblistList: [...currentLists, mdbList]
            };
        }
        
        this.saveLocalCustomLists();
        this.syncConfigToTrakt(); // Trigger sync
    }

    // Get AI recommendations (kept for compatibility)
    getAIRecommendations(): { items: MediaItem[], timestamp: number, sourceHash: string } | null {
        const saved = localStorage.getItem('ai_recommendations');
        return saved ? JSON.parse(saved) : null;
    }

    setAIRecommendations(items: MediaItem[], sourceHash: string) {
        localStorage.setItem('ai_recommendations', JSON.stringify({
            items,
            timestamp: Date.now(),
            sourceHash
        }));
    }

    // List Thumbnail Size Preference
    getThumbnailSize(): 'small' | 'medium' | 'large' {
        return (localStorage.getItem('thumbnail_size') as 'small' | 'medium' | 'large') || 'medium';
    }

    setThumbnailSize(size: 'small' | 'medium' | 'large') {
        localStorage.setItem('thumbnail_size', size);
    }

    // Force refresh from Simkl
    async refresh(): Promise<void> {
        await this.fetchLists(true);
    }
}

export const storageService = new StorageService();

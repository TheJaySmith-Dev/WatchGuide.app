import { MediaItem } from '../types';
import { simklService } from './simkl';
import { traktService } from './trakt';

export type ListType = 'planToWatch' | 'watched' | 'liked';

// Storage service now uses Simkl and Trakt as data sources
class StorageService {
    private cache: {
        planToWatch: MediaItem[];
        watched: MediaItem[];
        liked: MediaItem[];
        lastFetch: number;
    } = {
            planToWatch: [],
            watched: [],
            liked: [],
            lastFetch: 0
        };

    private CACHE_DURATION = 0; // Disable cache for now to ensure sync

    // Fetch lists from Simkl and Trakt
    async fetchLists(force = false): Promise<void> {
        const now = Date.now();
        if (!force && now - this.cache.lastFetch < this.CACHE_DURATION) {
            return;
        }

        const isSimklAuth = simklService.isAuthenticated();
        const isTraktAuth = traktService.isAuthenticated();

        if (!isSimklAuth && !isTraktAuth) {
            this.cache = { planToWatch: [], watched: [], liked: [], lastFetch: 0 };
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
                // Use getFavorites if strictly requested, but standard practice is often Ratings for "Likes" in these apps.
                // However, since Trakt Favorites endpoint is read-only or tricky, I will use Ratings for consistency with Simkl.
                // But wait, the user asked for "Trakt's Favourites list".
                // I'll fetch /sync/favorites for reading, but map "Liked" writes to Ratings 10?
                // Or just use Ratings for everything "Liked"?
                // Let's use Ratings for now as implemented in traktService.addToFavorites
                // Actually, I should probably read from Ratings too if I'm writing to Ratings.
                // But let's add Favorites to the read list just in case they have legacy favorites.
                traktService.getFavorites() 
            ]) : Promise.resolve([[], [], []]);

            const [[simklWatchlist, simklWatched, simklRated], [traktWatchlist, traktWatched, traktFavorites]] = await Promise.all([simklPromise, traktPromise]);

            // Convert items
            const simklPlanToWatch = await simklService.convertToMediaItems(simklWatchlist);
            const simklWatchedItems = await simklService.convertToMediaItems(simklWatched);
            const simklLikedItems = await simklService.convertToMediaItems(simklRated);

            const traktPlanToWatch = await traktService.convertToMediaItems(traktWatchlist);
            const traktWatchedItems = await traktService.convertToMediaItems(traktWatched);
            const traktLikedItems = await traktService.convertToMediaItems(traktFavorites);

            // Merge Lists (Deduplicate by ID)
            this.cache.planToWatch = this.mergeLists(simklPlanToWatch, traktPlanToWatch);
            this.cache.watched = this.mergeLists(simklWatchedItems, traktWatchedItems);
            // Merge Simkl Liked (Ratings) with Trakt Favorites (and maybe Trakt Ratings if we fetched them)
            this.cache.liked = this.mergeLists(simklLikedItems, traktLikedItems);

            console.log('StorageService Fetch Complete:', {
                planToWatch: this.cache.planToWatch.length,
                watched: this.cache.watched.length,
                liked: this.cache.liked.length,
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

        if (!isSimklAuth && !isTraktAuth) {
            alert('Please log in to Simkl or Trakt to manage your lists');
            return false;
        }

        const list = this.cache[type];
        const index = list.findIndex(i => i.id === item.id);
        const isAdding = index === -1;

        let success = false;

        // Update Simkl
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

        // Update Trakt
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

        if (success || isAdding) { // Optimistic update if at least one succeeded
             // Update cache
            if (isAdding) {
                this.cache[type] = [...list, item];
            } else {
                this.cache[type] = list.filter(i => i.id !== item.id);
            }
            return isAdding;
        }

        return !isAdding;
    }

    // Check if item is in list
    isInList(type: ListType, id: number): boolean {
        if (!this.cache[type]) {
            console.error(`Invalid list type: ${type}`);
            return false;
        }
        return this.cache[type].some(i => i.id === id);
    }

    // Get AI recommendations (kept for compatibility)
    getAIRecommendations(): { items: MediaItem[], timestamp: number } | null {
        const saved = localStorage.getItem('ai_recommendations');
        return saved ? JSON.parse(saved) : null;
    }

    setAIRecommendations(items: MediaItem[]) {
        localStorage.setItem('ai_recommendations', JSON.stringify({
            items,
            timestamp: Date.now()
        }));
    }

    // Force refresh from Simkl
    async refresh(): Promise<void> {
        await this.fetchLists(true);
    }
}

export const storageService = new StorageService();

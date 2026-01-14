import { MediaItem } from '../types';
import { simklService } from './simkl';

export type ListType = 'wantToWatch' | 'watched' | 'liked';

// Storage service now uses Simkl as primary data source
class StorageService {
    private cache: {
        wantToWatch: MediaItem[];
        watched: MediaItem[];
        liked: MediaItem[];
        lastFetch: number;
    } = {
            wantToWatch: [],
            watched: [],
            liked: [],
            lastFetch: 0
        };

    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Fetch lists from Simkl
    async fetchLists(): Promise<void> {
        if (!simklService.isAuthenticated()) {
            this.cache = { wantToWatch: [], watched: [], liked: [], lastFetch: 0 };
            return;
        }

        try {
            const [watchlistItems, watchedItems] = await Promise.all([
                simklService.getWatchlist(),
                simklService.getWatched()
            ]);

            // Convert Simkl items to MediaItems
            this.cache.wantToWatch = await simklService.convertToMediaItems(watchlistItems);
            this.cache.watched = await simklService.convertToMediaItems(watchedItems);
            this.cache.liked = []; // Simkl doesn't have a separate "liked" list
            this.cache.lastFetch = Date.now();
        } catch (error) {
            console.error('Failed to fetch lists from Simkl:', error);
        }
    }

    // Get list with automatic refresh if cache is stale
    async getList(type: ListType): Promise<MediaItem[]> {
        const now = Date.now();
        if (now - this.cache.lastFetch > this.CACHE_DURATION) {
            await this.fetchLists();
        }
        return this.cache[type];
    }

    // Get list synchronously (uses cached data)
    getListSync(type: ListType): MediaItem[] {
        return this.cache[type];
    }

    // Toggle item in list
    async toggleItem(type: ListType, item: MediaItem): Promise<boolean> {
        if (!simklService.isAuthenticated()) {
            alert('Please log in to Simkl to manage your lists');
            return false;
        }

        const list = this.cache[type];
        const index = list.findIndex(i => i.id === item.id);
        const isAdding = index === -1;

        // Update Simkl
        let success = false;
        if (type === 'wantToWatch') {
            success = isAdding
                ? await simklService.addToList(item, 'watchlist')
                : await simklService.removeFromList(item, 'watchlist');
        } else if (type === 'watched') {
            success = isAdding
                ? await simklService.addToList(item, 'watched')
                : await simklService.removeFromList(item, 'watched');
        } else if (type === 'liked') {
            // For liked, we'll use watchlist as fallback
            success = isAdding
                ? await simklService.addToList(item, 'watchlist')
                : await simklService.removeFromList(item, 'watchlist');
        }

        if (success) {
            // Update cache
            if (isAdding) {
                this.cache[type] = [...list, item];
            } else {
                this.cache[type] = list.filter(i => i.id !== item.id);
            }
            return isAdding; // Return true if added, false if removed
        }

        return !isAdding; // If failed, return current state (opposite of what we tried)
    }

    // Check if item is in list
    isInList(type: ListType, id: number): boolean {
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
        await this.fetchLists();
    }
}

export const storageService = new StorageService();

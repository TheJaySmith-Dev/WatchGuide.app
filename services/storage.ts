import { MediaItem } from '../types';
import { simklService } from './simkl';

export type ListType = 'wantToWatch' | 'watched' | 'liked';

export interface UserData {
    wantToWatch: MediaItem[];
    watched: MediaItem[];
    liked: MediaItem[];
    aiRecommendations?: MediaItem[];
    aiTimestamp?: number;
    simklSyncEnabled?: boolean;
    lastSimklSync?: number;
}

const STORAGE_KEY = 'watchguide_user_data';

class StorageService {
    private data: UserData;

    constructor() {
        const saved = localStorage.getItem(STORAGE_KEY);
        this.data = saved ? JSON.parse(saved) : {
            wantToWatch: [],
            watched: [],
            liked: [],
            simklSyncEnabled: false
        };
    }

    private save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    getList(type: ListType): MediaItem[] {
        return this.data[type];
    }

    toggleItem(type: ListType, item: MediaItem) {
        const list = this.data[type];
        const index = list.findIndex(i => i.id === item.id);
        const isAdding = index === -1;

        if (index > -1) {
            this.data[type] = list.filter(i => i.id !== item.id);
        } else {
            this.data[type] = [...list, item];
        }
        this.save();

        // Sync to Simkl if enabled and authenticated
        if (this.isSimklSyncEnabled() && simklService.isAuthenticated()) {
            if (type === 'wantToWatch') {
                if (isAdding) {
                    simklService.addToList(item, 'watchlist');
                } else {
                    simklService.removeFromList(item, 'watchlist');
                }
            } else if (type === 'watched') {
                if (isAdding) {
                    simklService.addToList(item, 'watched');
                } else {
                    simklService.removeFromList(item, 'watched');
                }
            }
            this.updateLastSimklSync();
        }

        return this.isInList(type, item.id);
    }

    isInList(type: ListType, id: number): boolean {
        return this.data[type].some(i => i.id === id);
    }

    getAIRecommendations(): { items: MediaItem[], timestamp: number } | null {
        if (this.data.aiRecommendations && this.data.aiTimestamp) {
            return { items: this.data.aiRecommendations, timestamp: this.data.aiTimestamp };
        }
        return null;
    }

    setAIRecommendations(items: MediaItem[]) {
        this.data.aiRecommendations = items;
        this.data.aiTimestamp = Date.now();
        this.save();
    }

    exportData(): string {
        try {
            const str = JSON.stringify(this.data);
            // Support Unicode by encoding to UTF-8 before btoa
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            console.error('Export failed:', e);
            return "";
        }
    }

    importData(syncString: string): boolean {
        if (!syncString) return false;
        try {
            const decoded = decodeURIComponent(escape(atob(syncString.trim())));
            const newData = JSON.parse(decoded);

            // Basic validation
            if (newData.wantToWatch && newData.watched && newData.liked) {
                this.data = {
                    ...this.data,
                    ...newData
                };
                this.save();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }

    // Simkl Sync Methods
    isSimklSyncEnabled(): boolean {
        return this.data.simklSyncEnabled || false;
    }

    setSimklSyncEnabled(enabled: boolean) {
        this.data.simklSyncEnabled = enabled;
        if (enabled) {
            this.data.lastSimklSync = Date.now();
        }
        this.save();
    }

    updateLastSimklSync() {
        this.data.lastSimklSync = Date.now();
        this.save();
    }

    getLastSimklSync(): number | undefined {
        return this.data.lastSimklSync;
    }
}

export const storageService = new StorageService();

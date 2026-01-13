import { MediaItem } from '../types';

export type ListType = 'wantToWatch' | 'watched' | 'liked';

export interface UserData {
    wantToWatch: MediaItem[];
    watched: MediaItem[];
    liked: MediaItem[];
    aiRecommendations?: MediaItem[];
    aiTimestamp?: number;
}

const STORAGE_KEY = 'watchguide_user_data';

class StorageService {
    private data: UserData;

    constructor() {
        const saved = localStorage.getItem(STORAGE_KEY);
        this.data = saved ? JSON.parse(saved) : {
            wantToWatch: [],
            watched: [],
            liked: []
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

        if (index > -1) {
            this.data[type] = list.filter(i => i.id !== item.id);
        } else {
            this.data[type] = [...list, item];
        }
        this.save();
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
        return btoa(JSON.stringify(this.data));
    }

    importData(syncString: string): boolean {
        try {
            const decoded = atob(syncString);
            const newData = JSON.parse(decoded);

            // Basic validation
            if (newData.wantToWatch && newData.watched && newData.liked) {
                this.data = newData;
                this.save();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
}

export const storageService = new StorageService();

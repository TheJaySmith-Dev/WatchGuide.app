import { MediaItem, SimklUser, SimklList } from '../types';

const SIMKL_CLIENT_ID = 'YOUR_SIMKL_CLIENT_ID'; // To be provided by user
const SIMKL_REDIRECT_URI = window.location.origin;
const API_BASE_URL = 'https://api.simkl.com';

class SimklService {
    private accessToken: string | null = null;

    constructor() {
        this.accessToken = localStorage.getItem('simkl_access_token');
    }

    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    getLoginUrl(): string {
        return `https://simkl.com/oauth/authorize?response_type=code&client_id=${SIMKL_CLIENT_ID}&redirect_uri=${encodeURIComponent(SIMKL_REDIRECT_URI)}`;
    }

    async exchangeCodeForToken(code: string): Promise<string> {
        try {
            const response = await fetch(`${API_BASE_URL}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code,
                    client_id: SIMKL_CLIENT_ID,
                    // client_secret: '...', // Usually needed for server-side, Simkl might support public clients or needs this via proxy
                    redirect_uri: SIMKL_REDIRECT_URI,
                }),
            });

            if (!response.ok) throw new Error('Failed to exchange code');

            const data = await response.json();
            this.accessToken = data.access_token;
            localStorage.setItem('simkl_access_token', this.accessToken!);
            return this.accessToken!;
        } catch (error) {
            console.error('Simkl Auth Error:', error);
            throw error;
        }
    }

    async getUserProfile(): Promise<SimklUser | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`${API_BASE_URL}/users/settings`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });
            const data = await response.json();
            return {
                name: data.user.name,
                avatar: data.user.avatar,
            };
        } catch (error) {
            return null;
        }
    }

    async getWatchlist(type: 'movies' | 'shows', status: 'watching' | 'plantowatch' | 'hold' | 'completed'): Promise<any[]> {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${API_BASE_URL}/sync/all-items/${type}/${status}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    async addToWatchlist(type: 'movie' | 'tv', id: number): Promise<boolean> {
        if (!this.accessToken) return false;

        try {
            const endpoint = type === 'movie' ? '/sync/add-to-list/movies/plantowatch' : '/sync/add-to-list/shows/plantowatch';
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [type === 'movie' ? 'movies' : 'shows']: [{ ids: { tmdb: id } }]
                }),
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    logout() {
        this.accessToken = null;
        localStorage.removeItem('simkl_access_token');
    }
}

export const simklService = new SimklService();

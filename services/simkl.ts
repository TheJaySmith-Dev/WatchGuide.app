import { MediaItem, SimklUser, SimklList } from '../types';

const SIMKL_CLIENT_ID = (import.meta.env.VITE_SIMKL_CLIENT_ID || 'ae388b07e6b83e08f7f2da02cdaa8dacb3c58b49a86e686ad79231d4612372b9').trim();
const SIMKL_CLIENT_SECRET = (import.meta.env.VITE_SIMKL_CLIENT_SECRET || '115a54c1d89ff52dc607a292a2b74efd6d6eb1ed9ca84ffae02bda900975bc48').trim();

// Use the exact value from .env, or the browser's current origin if empty.
const SIMKL_REDIRECT_URI = (import.meta.env.VITE_SIMKL_REDIRECT_URI || window.location.origin).replace(/\/$/, '');

console.log('--- SIMKL DEBUG START ---');
console.log('Client ID:', SIMKL_CLIENT_ID);
console.log('Redirect URI:', SIMKL_REDIRECT_URI);
console.log('--- SIMKL DEBUG END ---');

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
            const body = {
                grant_type: 'authorization_code',
                code,
                client_id: SIMKL_CLIENT_ID,
                client_secret: SIMKL_CLIENT_SECRET,
                redirect_uri: SIMKL_REDIRECT_URI,
            };

            // Try JSON first
            const response = await fetch(`${API_BASE_URL}/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                // Fallback to x-www-form-urlencoded
                const formBody = new URLSearchParams();
                Object.entries(body).forEach(([key, value]) => {
                    if (value) formBody.append(key, value);
                });

                const fallbackResponse = await fetch(`${API_BASE_URL}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formBody.toString(),
                });

                if (!fallbackResponse.ok) {
                    const fallbackError = await fallbackResponse.text();
                    throw new Error(`Auth failed: ${fallbackError}`);
                }

                const data = await fallbackResponse.json();
                this.accessToken = data.access_token;
            } else {
                const data = await response.json();
                this.accessToken = data.access_token;
            }

            if (this.accessToken) {
                localStorage.setItem('simkl_access_token', this.accessToken);
                return this.accessToken;
            }
            throw new Error('No access token received');
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

import { MediaItem, SimklUser, SimklList } from '../types';

const SIMKL_CLIENT_ID = import.meta.env.VITE_SIMKL_CLIENT_ID;
const SIMKL_CLIENT_SECRET = import.meta.env.VITE_SIMKL_CLIENT_SECRET;
const SIMKL_REDIRECT_URI = window.location.origin;
const API_BASE_URL = 'https://api.simkl.com';

if (!SIMKL_CLIENT_ID) {
    console.warn('Simkl Error: VITE_SIMKL_CLIENT_ID is not defined. Make sure .env exists and dev server was restarted.');
}

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
        console.log('Simkl Auth: Starting exchange...', {
            client_id: SIMKL_CLIENT_ID?.substring(0, 5) + '...',
            redirect_uri: SIMKL_REDIRECT_URI,
            code: code.substring(0, 5) + '...'
        });

        try {
            // Some Simkl docs suggest JSON, others form-data. Let's try JSON first as it's what we had.
            const body = {
                grant_type: 'authorization_code',
                code,
                client_id: SIMKL_CLIENT_ID,
                client_secret: SIMKL_CLIENT_SECRET,
                redirect_uri: SIMKL_REDIRECT_URI,
            };

            const response = await fetch(`${API_BASE_URL}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Simkl Auth JSON failed:', errorText);

                // Fallback to x-www-form-urlencoded
                console.log('Simkl Auth: Retrying with x-www-form-urlencoded...');
                const formBody = new URLSearchParams();
                Object.entries(body).forEach(([key, value]) => {
                    if (value) formBody.append(key, value);
                });

                const fallbackResponse = await fetch(`${API_BASE_URL}/oauth/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formBody.toString(),
                });

                if (!fallbackResponse.ok) {
                    const fallbackError = await fallbackResponse.text();
                    console.error('Simkl Auth Fallback failed:', fallbackError);
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

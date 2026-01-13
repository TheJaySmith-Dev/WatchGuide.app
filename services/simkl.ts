import { MediaItem, SimklUser, SimklList } from '../types';

const SIMKL_CLIENT_ID = (import.meta.env.VITE_SIMKL_CLIENT_ID || 'ae388b07e6b83e08f7f2da02cdaa8dacb3c58b49a86e686ad79231d4612372b9').trim();
const SIMKL_CLIENT_SECRET = (import.meta.env.VITE_SIMKL_CLIENT_SECRET || '115a54c1d89ff52dc607a292a2b74efd6d6eb1ed9ca84ffae02bda900975bc48').trim();

// Support both watchguide.app and www.watchguide.app automatically
const currentOrigin = window.location.origin.replace(/\/$/, '');
const envRedirectUri = (import.meta.env.VITE_SIMKL_REDIRECT_URI || '').trim().replace(/\/$/, '');

// THE FIX: If envRedirectUri is provided but doesn't have a protocol, add one.
// If not provided, use the current window origin (standard OAuth practice).
const SIMKL_REDIRECT_URI = envRedirectUri
    ? (envRedirectUri.startsWith('http') ? envRedirectUri : `https://${envRedirectUri}`)
    : currentOrigin;

console.log('--- SIMKL DEBUG START ---');
console.log('Client ID (Length):', SIMKL_CLIENT_ID.length);
console.log('Redirect URI:', SIMKL_REDIRECT_URI);
console.log('Current URL:', window.location.href);
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

import { MediaItem } from '../types';

// Simkl API Configuration
const SIMKL_CLIENT_ID = 'ae388b07e6b83e08f7f2da02cdaa8dacb3c58b49a86e686ad79231d4612372b9';
const SIMKL_CLIENT_SECRET = '115a54c1d89ff52dc607a292a2b74efd6d6eb1ed9ca84ffae02bda900975bc48';
const SIMKL_REDIRECT_URI = window.location.origin + '/'; // OAuth redirect

const SIMKL_AUTH_URL = 'https://simkl.com/oauth/authorize';
const SIMKL_TOKEN_URL = 'https://api.simkl.com/oauth/token';
const SIMKL_API_BASE = 'https://api.simkl.com';

export interface SimklUser {
    user: {
        name: string;
        avatar: string;
    };
}

export interface SimklListItem {
    title: string;
    year?: number;
    ids: {
        simkl?: number;
        tmdb?: number;
        imdb?: string;
    };
}

class SimklService {
    private accessToken: string | null = null;

    constructor() {
        // Load token from localStorage if it exists
        this.accessToken = localStorage.getItem('simkl_access_token');
    }

    // OAuth Flow - Step 1: Redirect to Simkl authorization
    initiateOAuth() {
        const authUrl = `${SIMKL_AUTH_URL}?client_id=${SIMKL_CLIENT_ID}&redirect_uri=${encodeURIComponent(SIMKL_REDIRECT_URI)}&response_type=code`;
        window.location.href = authUrl;
    }

    // OAuth Flow - Step 2: Exchange code for access token
    async handleOAuthCallback(code: string): Promise<boolean> {
        try {
            const response = await fetch(SIMKL_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    client_id: SIMKL_CLIENT_ID,
                    client_secret: SIMKL_CLIENT_SECRET,
                    redirect_uri: SIMKL_REDIRECT_URI,
                    grant_type: 'authorization_code',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for token');
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            localStorage.setItem('simkl_access_token', this.accessToken!);
            return true;
        } catch (error) {
            console.error('OAuth callback error:', error);
            return false;
        }
    }

    // Get current user info
    async getCurrentUser(): Promise<SimklUser | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`${SIMKL_API_BASE}/users/settings`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user');
            }

            const data = await response.json();
            localStorage.setItem('simkl_user', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    // Add item to Simkl list
    async addToList(item: MediaItem, listType: 'watchlist' | 'watched'): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        const endpoint = listType === 'watchlist'
            ? `${SIMKL_API_BASE}/sync/add-to-list`
            : `${SIMKL_API_BASE}/sync/history`;

        try {
            const payload = {
                [mediaType]: [{
                    title: item.title || item.name,
                    year: item.release_date ? new Date(item.release_date).getFullYear() :
                        item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
                    ids: {
                        tmdb: item.id,
                    },
                }],
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });

            return response.ok;
        } catch (error) {
            console.error('Add to list error:', error);
            return false;
        }
    }

    // Remove item from Simkl list
    async removeFromList(item: MediaItem, listType: 'watchlist' | 'watched'): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        const endpoint = `${SIMKL_API_BASE}/sync/history/remove`;

        try {
            const payload = {
                [mediaType]: [{
                    ids: {
                        tmdb: item.id,
                    },
                }],
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });

            return response.ok;
        } catch (error) {
            console.error('Remove from list error:', error);
            return false;
        }
    }

    // Get all items from Simkl watchlist
    async getWatchlist(): Promise<SimklListItem[]> {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${SIMKL_API_BASE}/sync/all-items/movies,shows/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) return [];

            const data = await response.json();
            return [...(data.movies || []), ...(data.shows || [])];
        } catch (error) {
            console.error('Get watchlist error:', error);
            return [];
        }
    }

    // Get all watched items from Simkl
    async getWatched(): Promise<SimklListItem[]> {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${SIMKL_API_BASE}/sync/all-items/movies,shows/watched`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) return [];

            const data = await response.json();
            return [...(data.movies || []), ...(data.shows || [])];
        } catch (error) {
            console.error('Get watched error:', error);
            return [];
        }
    }

    // Check if user is logged in
    isAuthenticated(): boolean {
        return this.accessToken !== null;
    }

    // Logout
    logout() {
        this.accessToken = null;
        localStorage.removeItem('simkl_access_token');
        localStorage.removeItem('simkl_user');
    }
}

export const simklService = new SimklService();

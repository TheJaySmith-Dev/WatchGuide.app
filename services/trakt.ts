import { MediaItem, TraktListItem, TraktUser } from '../types';
import { searchMulti, getMediaBasic } from './api';

// Trakt API Configuration
const TRAKT_CLIENT_ID = '7a21622de3781573c3b182c40d2e5365ac78adf0fcf28aebf8e0b0a95cf172cd';
const TRAKT_CLIENT_SECRET = 'b5f110f77316e6c2ad889b19be55939bc369bee255b9d158dbadc78b555ca65e';
const TRAKT_REDIRECT_URI = window.location.origin + '/'; // OAuth redirect

const TRAKT_API_URL = 'https://api.trakt.tv';
const TRAKT_OAUTH_URL = 'https://trakt.tv/oauth/authorize';
const TRAKT_TOKEN_URL = 'https://api.trakt.tv/oauth/token';

class TraktService {
    private accessToken: string | null = null;

    constructor() {
        this.accessToken = localStorage.getItem('trakt_access_token');
    }

    // OAuth Flow - Step 1: Redirect to Trakt authorization
    initiateOAuth() {
        console.log('Initiating Trakt OAuth...');
        // Set a flag to know we are waiting for Trakt
        localStorage.setItem('auth_provider_pending', 'trakt');
        
        const authUrl = `${TRAKT_OAUTH_URL}?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(TRAKT_REDIRECT_URI)}`;
        window.location.href = authUrl;
    }

    // OAuth Flow - Step 2: Exchange code for access token
    async handleOAuthCallback(code: string): Promise<boolean> {
        try {
            console.log('Exchanging Trakt code for token...');
            const response = await fetch(TRAKT_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    client_id: TRAKT_CLIENT_ID,
                    client_secret: TRAKT_CLIENT_SECRET,
                    redirect_uri: TRAKT_REDIRECT_URI,
                    grant_type: 'authorization_code',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to exchange Trakt code:', errorText);
                return false;
            }

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                localStorage.setItem('trakt_access_token', this.accessToken!);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Trakt OAuth error:', error);
            return false;
        }
    }

    isAuthenticated(): boolean {
        return this.accessToken !== null;
    }

    logout() {
        this.accessToken = null;
        localStorage.removeItem('trakt_access_token');
        localStorage.removeItem('trakt_user');
    }

    // Get current user info
    async getCurrentUser(): Promise<TraktUser | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`${TRAKT_API_URL}/users/me`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (!response.ok) return null;
            const data = await response.json();
            localStorage.setItem('trakt_user', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Get Trakt user error:', error);
            return null;
        }
    }

    // Get Watchlist
    async getWatchlist(): Promise<TraktListItem[]> {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${TRAKT_API_URL}/sync/watchlist`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Watchlist)');
                return [];
            }

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Get Trakt watchlist error:', error);
            return [];
        }
    }

    // Get Watched History
    async getWatched(): Promise<TraktListItem[]> {
        if (!this.accessToken) return [];

        try {
            // Trakt has separate endpoints for watched movies and shows
            // And they return a different format (aggregated by show usually), but sync/history returns individual plays
            // We'll use sync/history for flat list of everything
            const response = await fetch(`${TRAKT_API_URL}/sync/history`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (History)');
                return [];
            }

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Get Trakt watched error:', error);
            return [];
        }
    }

    // Get Favorites
    async getFavorites(): Promise<TraktListItem[]> {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${TRAKT_API_URL}/sync/favorites`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Favorites)');
                return [];
            }

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Get Trakt favorites error:', error);
            return [];
        }
    }

    // Add item to Trakt Favorites (or other lists)
    async addToFavorites(item: MediaItem): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        
        try {
            const payload = {
                [mediaType]: [{
                    ids: {
                        tmdb: item.id,
                    },
                    title: item.title || item.name,
                }],
            };

            // Use the standard Add to Favorites endpoint (POST /sync/favorites)
            // Note: This endpoint is documented in API docs even if sometimes debated.
            // If it fails, it might be due to API restrictions, but this is the correct semantic endpoint requested.
            const response = await fetch(`${TRAKT_API_URL}/sync/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });
            
             if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Add Favorites)');
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Trakt add to favorites error:', error);
            return false;
        }
    }

    // Remove from Favorites
    async removeFromFavorites(item: MediaItem): Promise<boolean> {
        if (!this.accessToken) return false;
        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';

        try {
             const payload = {
                [mediaType]: [{
                    ids: { tmdb: item.id },
                }]
            };
            
             const response = await fetch(`${TRAKT_API_URL}/sync/favorites/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });
            
            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Remove Favorites)');
                return false;
            }

            return response.ok;
        } catch (error) {
             console.error('Trakt remove from favorites error:', error);
            return false;
        }
    }

    // Add item to Trakt list
    async addToList(item: MediaItem, listType: 'watchlist' | 'watched'): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        const endpoint = listType === 'watchlist'
            ? `${TRAKT_API_URL}/sync/watchlist`
            : `${TRAKT_API_URL}/sync/history`;

        try {
            const payload = {
                [mediaType]: [{
                    ids: {
                        tmdb: item.id,
                    },
                    // Optional: Add title/year for better matching if ID fails, 
                    // but TMDB ID is usually sufficient for Trakt
                    title: item.title || item.name,
                    year: item.release_date ? new Date(item.release_date).getFullYear() :
                        item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
                }],
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Add)');
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Trakt add to list error:', error);
            return false;
        }
    }

    // Remove item from Trakt list
    async removeFromList(item: MediaItem, listType: 'watchlist' | 'watched'): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        const endpoint = listType === 'watchlist'
            ? `${TRAKT_API_URL}/sync/watchlist/remove`
            : `${TRAKT_API_URL}/sync/history/remove`;

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
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 429) {
                console.warn('Trakt API Rate Limit Exceeded (Remove)');
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Trakt remove from list error:', error);
            return false;
        }
    }

    // Convert Trakt items to MediaItem
    async convertToMediaItems(traktItems: TraktListItem[]): Promise<MediaItem[]> {
        const mediaItems: MediaItem[] = [];
        const batchSize = 5;

        for (let i = 0; i < traktItems.length; i += batchSize) {
            const batch = traktItems.slice(i, i + batchSize);
            const promises = batch.map(async (item) => {
                let tmdbId: number | undefined;
                let type: 'movie' | 'tv' | undefined;
                let title: string | undefined;

                if (item.type === 'movie' && item.movie) {
                    tmdbId = item.movie.ids.tmdb;
                    type = 'movie';
                    title = item.movie.title;
                } else if (item.type === 'show' && item.show) {
                    tmdbId = item.show.ids.tmdb;
                    type = 'tv';
                    title = item.show.title;
                } else if (item.type === 'episode' && item.show) {
                    // For now, treat episodes as the show itself
                    tmdbId = item.show.ids.tmdb;
                    type = 'tv';
                    title = item.show.title;
                }

                if (!tmdbId || !type) return null;

                try {
                    return await getMediaBasic(type, tmdbId);
                } catch (e) {
                    console.warn(`Trakt conversion failed for ${title}`, e);
                    // Fallback to search could go here
                    return null;
                }
            });

            const results = await Promise.all(promises);
            results.forEach(r => { if (r) mediaItems.push(r); });
            
            if (i + batchSize < traktItems.length) {
                 await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        return mediaItems;
    }

    // Search Lists
    async searchLists(query: string): Promise<import('../types').TraktListSearchResult[]> {
        try {
            const response = await fetch(`${TRAKT_API_URL}/search/list?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Search Trakt lists error:', error);
            return [];
        }
    }

    // Get User's Liked Lists
    async getLikedLists(): Promise<import('../types').TraktList[]> {
        if (!this.accessToken) return [];

        try {
            // Increase limit to 100 to ensure we get most lists
            const response = await fetch(`${TRAKT_API_URL}/users/me/likes/lists?limit=100`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (!response.ok) return [];
            // Response is array of { liked_at, list: TraktList }
            const data = await response.json();
            return data.map((item: any) => item.list);
        } catch (error) {
            console.error('Get Trakt liked lists error:', error);
            return [];
        }
    }

    // Like a List
    async likeList(listId: number): Promise<boolean> {
        if (!this.accessToken) return false;

        try {
            const response = await fetch(`${TRAKT_API_URL}/lists/${listId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            return response.ok; // 204 No Content usually
        } catch (error) {
            console.error('Like Trakt list error:', error);
            return false;
        }
    }

    // Unlike a List
    async unlikeList(listId: number): Promise<boolean> {
        if (!this.accessToken) return false;

        try {
            const response = await fetch(`${TRAKT_API_URL}/lists/${listId}/like`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            return response.ok;
        } catch (error) {
            console.error('Unlike Trakt list error:', error);
            return false;
        }
    }

    // Get List Items
    async getListItems(listId: number | string): Promise<TraktListItem[]> {
        const headers: any = {
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': TRAKT_CLIENT_ID,
        };
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${TRAKT_API_URL}/lists/${listId}/items`, {
                headers
            });

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Get Trakt list items error:', error);
            return [];
        }
    }
}

export const traktService = new TraktService();

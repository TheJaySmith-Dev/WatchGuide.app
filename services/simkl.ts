import { MediaItem, SimklListItem, SimklUser } from '../types';
import { searchMulti, getMediaBasic } from './api';

// Simkl API Configuration
const SIMKL_CLIENT_ID = 'ae388b07e6b83e08f7f2da02cdaa8dacb3c58b49a86e686ad79231d4612372b9';
const SIMKL_CLIENT_SECRET = '115a54c1d89ff52dc607a292a2b74efd6d6eb1ed9ca84ffae02bda900975bc48';
const SIMKL_REDIRECT_URI = window.location.origin + '/'; // OAuth redirect

const SIMKL_AUTH_URL = 'https://simkl.com/oauth/authorize';
const SIMKL_TOKEN_URL = 'https://api.simkl.com/oauth/token';
const SIMKL_API_BASE = 'https://api.simkl.com';

class SimklService {
    private accessToken: string | null = null;

    constructor() {
        // Load token from localStorage if it exists
        this.accessToken = localStorage.getItem('simkl_access_token');
    }

    // OAuth Flow - Step 1: Redirect to Simkl authorization
    initiateOAuth() {
        console.log('Initiating OAuth with Redirect URI:', SIMKL_REDIRECT_URI);
        localStorage.setItem('auth_provider_pending', 'simkl');
        const authUrl = `${SIMKL_AUTH_URL}?client_id=${SIMKL_CLIENT_ID}&redirect_uri=${encodeURIComponent(SIMKL_REDIRECT_URI)}&response_type=code`;
        window.location.href = authUrl;
    }

    // OAuth Flow - Step 2: Exchange code for access token
    async handleOAuthCallback(code: string): Promise<boolean> {
        try {
            console.log('Exchanging code for token:', code);
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

            console.log('Simkl Token Response Status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to exchange code for token:', errorText);
                localStorage.setItem('simkl_last_error', `${response.status} ${errorText}`);
                return false; // Return false instead of throwing to allow App.tsx to handle UI
            }

            const data = await response.json();
            console.log('Simkl Token Data:', data);
            
            if (data.access_token) {
                this.accessToken = data.access_token;
                localStorage.setItem('simkl_access_token', this.accessToken!);
                return true;
            } else {
                console.error('No access token in response');
                return false;
            }
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
        // Different endpoints for watchlist vs watched
        const endpoint = listType === 'watchlist'
            ? `${SIMKL_API_BASE}/sync/remove-from-list`
            : `${SIMKL_API_BASE}/sync/history/remove`;

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

    // Get latest activity timestamps
    async getLastActivities(): Promise<any> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`${SIMKL_API_BASE}/sync/activities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Get last activities error:', error);
            return null;
        }
    }

    // Get all items from Simkl watchlist
    async getWatchlist(dateFrom?: string): Promise<SimklListItem[]> {
        if (!this.accessToken) return [];

        try {
            // Fetch movies and shows separately
            const moviesPromise = fetch(`${SIMKL_API_BASE}/sync/all-items/movies/plantowatch${dateFrom ? `?date_from=${dateFrom}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });
            const showsPromise = fetch(`${SIMKL_API_BASE}/sync/all-items/shows/plantowatch${dateFrom ? `?date_from=${dateFrom}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            const [moviesRes, showsRes] = await Promise.all([moviesPromise, showsPromise]);
            
            let movies: SimklListItem[] = [];
            let shows: SimklListItem[] = [];

            if (moviesRes.ok) {
                const data = await moviesRes.json();
                // Check if data exists and has movies property
                if (data && data.movies) {
                    movies = data.movies.map((m: any) => ({ ...m, type: 'movie' }));
                }
            }
            
            if (showsRes.ok) {
                const data = await showsRes.json();
                // Check if data exists and has shows property
                if (data && data.shows) {
                    shows = data.shows.map((s: any) => ({ ...s, type: 'tv' }));
                }
            }

            return [...movies, ...shows];
        } catch (error) {
            console.error('Get watchlist error:', error);
            return [];
        }
    }

    // Get all watched items from Simkl
    async getWatched(dateFrom?: string): Promise<SimklListItem[]> {
        if (!this.accessToken) return [];

        try {
            // Fetch movies and shows separately
            const moviesPromise = fetch(`${SIMKL_API_BASE}/sync/all-items/movies/completed${dateFrom ? `?date_from=${dateFrom}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });
            const showsPromise = fetch(`${SIMKL_API_BASE}/sync/all-items/shows/completed${dateFrom ? `?date_from=${dateFrom}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            const [moviesRes, showsRes] = await Promise.all([moviesPromise, showsPromise]);
            
            let movies: SimklListItem[] = [];
            let shows: SimklListItem[] = [];

            if (moviesRes.ok) {
                const data = await moviesRes.json();
                // Check if data exists and has movies property
                if (data && data.movies) {
                    movies = data.movies.map((m: any) => ({ ...m, type: 'movie' }));
                }
            }
            
            if (showsRes.ok) {
                const data = await showsRes.json();
                // Check if data exists and has shows property
                if (data && data.shows) {
                    shows = data.shows.map((s: any) => ({ ...s, type: 'tv' }));
                }
            }

            return [...movies, ...shows];
        } catch (error) {
            console.error('Get watched error:', error);
            return [];
        }
    }

    // Get all ratings from Simkl
    async getRatings(dateFrom?: string): Promise<SimklListItem[]> {
        if (!this.accessToken) return [];

        try {
            // Fetch ratings separately (not strictly needed but safer)
            const response = await fetch(`${SIMKL_API_BASE}/sync/ratings${dateFrom ? `?date_from=${dateFrom}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) return [];

            const data = await response.json();
            if (!data) return [];
            
            const movies = data.movies ? data.movies.map((m: any) => ({ ...m, type: 'movie' })) : [];
            const shows = data.shows ? data.shows.map((s: any) => ({ ...s, type: 'tv' })) : [];
            return [...movies, ...shows];
        } catch (error) {
            console.error('Get ratings error:', error);
            return [];
        }
    }

    // Get calendar data from Simkl (Premieres only)
    async getCalendar(): Promise<MediaItem[]> {
        if (!this.accessToken) return [];

        try {
            // Fetch premieres for the next 30 days
            const response = await fetch(`${SIMKL_API_BASE}/calendars/premieres?days=30`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'simkl-api-key': SIMKL_CLIENT_ID,
                },
            });

            if (!response.ok) {
                console.error('Simkl Calendar API Error:', response.status, await response.text());
                return [];
            }

            const data = await response.json();
            console.log('Simkl Calendar Data:', data);
            
            const simklItems: SimklListItem[] = [];
            
            // Simkl calendar returns array of objects with 'date' and 'episodes'/'movies'
            // Ensure data is an array before iterating
            if (Array.isArray(data)) {
                data.forEach((day: any) => {
                    if (day.movies) {
                        day.movies.forEach((m: any) => {
                            simklItems.push({
                                title: m.title,
                                year: m.year,
                                ids: m.ids,
                                type: 'movie'
                            });
                        });
                    }
                    if (day.episodes) {
                         day.episodes.forEach((e: any) => {
                            simklItems.push({
                                title: e.show.title,
                                year: e.show.year,
                                ids: e.show.ids,
                                type: 'tv'
                            });
                         });
                    }
                });
            } else {
                 console.warn('Simkl Calendar data is not an array:', data);
            }

            return await this.convertToMediaItems(simklItems);
        } catch (error) {
            console.error('Get calendar error:', error);
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

    // Add item with rating to Simkl list
    async addRating(item: MediaItem, rating: number = 10): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        
        try {
            const payload = {
                [mediaType]: [{
                    title: item.title || item.name,
                    year: item.release_date ? new Date(item.release_date).getFullYear() :
                        item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
                    ids: {
                        tmdb: item.id,
                    },
                    rating: rating,
                    rated_at: new Date().toISOString()
                }],
            };

            const response = await fetch(`${SIMKL_API_BASE}/sync/ratings`, {
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
            console.error('Add rating error:', error);
            return false;
        }
    }

    // Remove rating from Simkl
    async removeRating(item: MediaItem): Promise<boolean> {
        if (!this.accessToken) return false;

        const mediaType = item.media_type === 'movie' ? 'movies' : 'shows';
        
        try {
            const payload = {
                [mediaType]: [{
                    ids: {
                        tmdb: item.id,
                    },
                }],
            };

            const response = await fetch(`${SIMKL_API_BASE}/sync/ratings/remove`, {
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
            console.error('Remove rating error:', error);
            return false;
        }
    }

    // Bulk sync all local lists to Simkl
    async syncAllToSimkl(planToWatch: MediaItem[], watched: MediaItem[]): Promise<{ success: boolean; synced: number }> {
        if (!this.accessToken) return { success: false, synced: 0 };

        let syncedCount = 0;

        try {
            // Sync plan to watch list
            for (const item of planToWatch) {
                const success = await this.addToList(item, 'watchlist');
                if (success) syncedCount++;
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Sync watched list
            for (const item of watched) {
                const success = await this.addToList(item, 'watched');
                if (success) syncedCount++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return { success: true, synced: syncedCount };
        } catch (error) {
            console.error('Bulk sync error:', error);
            return { success: false, synced: syncedCount };
        }
    }

    // Convert Simkl list items to MediaItem format
    async convertToMediaItems(simklItems: SimklListItem[]): Promise<MediaItem[]> {
        const mediaItems: MediaItem[] = [];
        if (!simklItems || simklItems.length === 0) return [];
        const batchSize = 5;
        
        console.log(`Converting ${simklItems.length} items...`, simklItems);
        let successCount = 0;

        for (let i = 0; i < simklItems.length; i += batchSize) {
            const batch = simklItems.slice(i, i + batchSize);
            console.log(`Processing batch ${i/batchSize + 1}/${Math.ceil(simklItems.length/batchSize)}`);
            
            const promises = batch.map(async (simklItem) => {
                // Simkl returns nested structure sometimes (item.movie.ids or item.show.ids)
                // Or sometimes flat (item.ids) depending on the endpoint
                // Let's normalize it
                let itemData = simklItem;
                let type = simklItem.type;
                let ids = simklItem.ids;
                let title = simklItem.title;

                // Handle nested structure if ids are missing at top level but exist in nested movie/show/anime
                if (!ids) {
                    if ((simklItem as any).movie && (simklItem as any).movie.ids) {
                        itemData = (simklItem as any).movie;
                        type = 'movie';
                        ids = itemData.ids;
                        title = itemData.title;
                    } else if ((simklItem as any).show && (simklItem as any).show.ids) {
                        itemData = (simklItem as any).show;
                        type = 'tv';
                        ids = itemData.ids;
                        title = itemData.title;
                    } else if ((simklItem as any).anime && (simklItem as any).anime.ids) {
                        itemData = (simklItem as any).anime;
                        type = 'tv'; // Treat anime as TV for TMDB
                        ids = itemData.ids;
                        title = itemData.title;
                    }
                }

                console.log('Processing item:', { title, type, ids });

                if (!ids) {
                    console.warn('Skipping item with missing IDs (deep check):', simklItem);
                    return null;
                }

                // If tmdb id is missing, try to search by title
                const tmdbId = ids.tmdb;

                try {
                    // Optimized: Use TMDB ID directly if available and type is known
                    if (type && tmdbId) {
                        const result = await getMediaBasic(type, tmdbId);
                        if (!result) console.warn(`TMDB fetch failed for ID ${tmdbId} (${title})`);
                        return result;
                    } else {
                        // Fallback to search if type is missing (legacy) or TMDB ID is missing
                        console.log(`Searching for "${title}" (TMDB ID: ${tmdbId})...`);
                        const results = await searchMulti(title);
                        
                        // Try to match by ID if we have it, otherwise just take the first result
                        let match = tmdbId ? results.find(r => r.id === tmdbId) : null;
                        
                        // If no ID match (or no ID), try to match by title loosely
                        if (!match && results.length > 0) {
                             match = results[0]; // Take best guess
                        }

                        if (match) {
                            return match;
                        } else {
                            console.warn(`No match found for "${title}"`);
                            return null;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to convert ${title}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            results.forEach(item => {
                if (item) {
                    mediaItems.push(item);
                    successCount++;
                }
            });
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < simklItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`Converted ${successCount}/${simklItems.length} items successfully.`);
        return mediaItems;
    }
}

export const simklService = new SimklService();

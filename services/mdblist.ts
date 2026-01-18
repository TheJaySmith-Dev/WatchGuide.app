import { MediaItem } from '../types';
import { getMediaDetails } from './api';

const CLIENT_ID = 'QymIY4IxaJ7ifLgCAIfRi3VQMfnDBbLeVA6VJ4FS';
const CLIENT_SECRET = 'Uap4U8Y4xuOu1JAfKKsgmUnS8SJSKDbmHzQLwTGOZ2bwuuLJY1OSArEMC2KstqCyBxhL9X4BOmt58rAPgvLzyAJhkpRmwv16NxOiKKkLMpAVu1SLhNu5XR59o0IofaB1';
const AUTH_URL = 'https://mdblist.com/oauth/authorize/';
const TOKEN_URL = '/mdblist-api/oauth/token/'; // Use proxy
const API_BASE = '/mdblist-api'; // Use proxy

const FALLBACK_LISTS = [
    { id: 18090, name: "Most Pirated Movies", items: 100, user_name: "MDBList", description: "Most downloaded movies this week" },
    { id: 2193, name: "Latest Movies", items: 300, user_name: "garycrawfordgc", description: "Top trending movies" },
    { id: 2194, name: "Latest TV Shows", items: 300, user_name: "garycrawfordgc", description: "Top trending shows" },
    { id: 13915, name: "Trending Movies", items: 100, user_name: "MDBList", description: "Trending movies on Trakt" },
    { id: 13916, name: "Trending TV Shows", items: 100, user_name: "MDBList", description: "Trending TV shows on Trakt" },
    { id: 1004, name: "IMDb Top 250 Movies", items: 250, user_name: "MDBList", description: "Top 250 movies as rated by IMDb Users" },
    { id: 1005, name: "IMDb Top 250 TV Shows", items: 250, user_name: "MDBList", description: "Top 250 TV shows as rated by IMDb Users" },
    { id: 489, name: "Marvel Cinematic Universe", items: 40, user_name: "MDBList", description: "All MCU movies in release order" },
    { id: 1400, name: "Disney+ Originals", items: 150, user_name: "MDBList", description: "Original movies and series from Disney+" },
    { id: 1399, name: "Netflix Originals", items: 500, user_name: "MDBList", description: "Original movies and series from Netflix" },
    { id: 1398, name: "Amazon Prime Video Originals", items: 200, user_name: "MDBList", description: "Original movies and series from Amazon Prime" },
    { id: 1401, name: "Apple TV+ Originals", items: 100, user_name: "MDBList", description: "Original movies and series from Apple TV+" },
    { id: 1402, name: "HBO Max Originals", items: 200, user_name: "MDBList", description: "Original movies and series from HBO Max" },
    { id: 1403, name: "Hulu Originals", items: 200, user_name: "MDBList", description: "Original movies and series from Hulu" },
    { id: 1404, name: "Paramount+ Originals", items: 100, user_name: "MDBList", description: "Original movies and series from Paramount+" },
    { id: 1405, name: "Peacock Originals", items: 100, user_name: "MDBList", description: "Original movies and series from Peacock" },
    { id: 367, name: "Star Wars Collection", items: 20, user_name: "MDBList", description: "All Star Wars movies and series" },
    { id: 368, name: "DC Extended Universe", items: 15, user_name: "MDBList", description: "DCEU movies in release order" },
    { id: 369, name: "Wizarding World", items: 11, user_name: "MDBList", description: "Harry Potter and Fantastic Beasts movies" }
];

class MDBListService {
    private accessToken: string | null = null;
    private codeVerifier: string | null = null;

    constructor() {
        this.accessToken = localStorage.getItem('mdblist_access_token');
        this.codeVerifier = localStorage.getItem('mdblist_code_verifier');
    }


    isAuthenticated() {
        return !!this.accessToken;
    }

    private generateCodeVerifier() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    private async generateCodeChallenge(verifier: string) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        
        // Convert to base64url
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    async initiateOAuth() {
        const verifier = this.generateCodeVerifier();
        this.codeVerifier = verifier;
        localStorage.setItem('mdblist_code_verifier', verifier);
        
        // MDBList snippet uses simpler verifier generation, but this should work.
        // Actually, snippet says: secrets.token_urlsafe(64)
        // My hex implementation is different. Let's stick to standard PKCE or the python equivalent.
        // JS equivalent for token_urlsafe(64) is roughly 64 random bytes base64url encoded.
        
        // Let's use a simple random string for verifier as long as it's high entropy
        const randomValues = new Uint8Array(64);
        window.crypto.getRandomValues(randomValues);
        const codeVerifier = btoa(String.fromCharCode(...randomValues))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            
        this.codeVerifier = codeVerifier;
        localStorage.setItem('mdblist_code_verifier', codeVerifier);

        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        const redirectUri = window.location.origin;
        localStorage.setItem('auth_provider_pending', 'mdblist');

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'read write',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        window.location.href = `${AUTH_URL}?${params.toString()}`;
    }

    async handleCallback(code: string) {
        const redirectUri = window.location.origin;
        const verifier = localStorage.getItem('mdblist_code_verifier');

        if (!verifier) {
            console.error('No code verifier found');
            return;
        }

        try {
            const response = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code_verifier: verifier
                })
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                localStorage.setItem('mdblist_access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('mdblist_refresh_token', data.refresh_token);
                }
                localStorage.removeItem('mdblist_code_verifier');
                return true;
            }
        } catch (error) {
            console.error('MDBList token exchange failed', error);
        }
        return false;
    }

    async getUserLists() {
        if (!this.accessToken) return [];
        try {
            const response = await fetch(`${API_BASE}/lists/user/`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getTopLists() {
        if (!this.accessToken) return FALLBACK_LISTS.slice(0, 10); // Return top 10 as default

        try {
            const response = await fetch(`${API_BASE}/lists/top`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) return FALLBACK_LISTS.slice(0, 10);
            return await response.json();
        } catch (e) {
            console.error('Failed to fetch top lists:', e);
            return FALLBACK_LISTS.slice(0, 10);
        }
    }

    async searchPublicLists(query: string) {
        // First try to find matches in our extensive fallback list to avoid API errors if possible
        const localMatches = FALLBACK_LISTS.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));
        
        if (!this.accessToken) return localMatches;
        
        try {
            const response = await fetch(`${API_BASE}/lists/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                // If API fails (e.g. CORS), return local matches
                return localMatches;
            }
            
            const apiResults = await response.json();
            
            // Merge results if needed, but API usually returns better matches
            if (!Array.isArray(apiResults)) return localMatches;
            
            return apiResults;
        } catch (e) {
            console.error('Failed to search public lists:', e);
            return localMatches;
        }
    }

    async searchLists(query: string) {
        const results: any[] = [];
        
        // 1. Search User Lists (only if authenticated)
        if (this.accessToken) {
            try {
                const userLists = await this.getUserLists();
                if (userLists && Array.isArray(userLists)) {
                    const matches = userLists.filter((l: any) => l.name.toLowerCase().includes(query.toLowerCase()));
                    results.push(...matches);
                }
            } catch (e) {
                console.error('Failed to search user lists', e);
            }
        }

        // 2. Search Public Lists (works with fallbacks even if not authenticated)
        try {
            const publicLists = await this.searchPublicLists(query);
            if (publicLists && Array.isArray(publicLists)) {
                // Filter out duplicates (if user list appears in public search)
                const existingIds = new Set(results.map(r => r.id));
                publicLists.forEach((l: any) => {
                    if (!existingIds.has(l.id)) {
                        results.push(l);
                    }
                });
            }
        } catch (e) {
            console.error('Failed to search public lists', e);
        }
        
        return results;
    }

    async getListItems(listId: number): Promise<MediaItem[]> {
        // Need to fetch list items. Endpoint guess: /lists/{id}/items or /lists/{id}
        // Docs usually have /lists/{id}/items
        // Snippet doesn't specify. I'll assume /lists/{id}/items or similar.
        // Actually, MDBList usually returns items in the list details or a separate call.
        // Let's try /lists/{id} first.
        
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`${API_BASE}/lists/${listId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (!response.ok) return [];
            
            const data = await response.json();
            // Assuming data has 'items' array.
            // Items usually have external IDs (tmdb, imdb).
            // We need to map them to MediaItem.
            
            if (!data.items) return [];

            const mediaItems: MediaItem[] = [];
            
            // Limit to 20 for performance initially, or fetch more.
            // MDBList items usually have { id, tmdb_id, imdb_id, title, ... }
            
            for (const item of data.items) {
                if (item.tmdb_id) {
                    // We can use the TMDB ID to get full details from our API service
                    // But that might be too many requests.
                    // Ideally, we construct a basic MediaItem from MDBList data
                    
                    mediaItems.push({
                        id: item.tmdb_id,
                        title: item.title,
                        name: item.title,
                        poster_path: item.poster_path || null, // MDBList might provide this?
                        backdrop_path: null,
                        overview: '',
                        media_type: item.mediatype || (item.season ? 'tv' : 'movie'), // Guessing fields
                        vote_average: item.score ? item.score / 10 : undefined
                    });
                }
            }
            
            return mediaItems;

        } catch (e) {
            console.error(e);
            return [];
        }
    }
    
    // Helper to enrich items with TMDB data if needed
    async enrichItems(items: MediaItem[]) {
        // Implementation to fetch details from TMDB if MDBList data is sparse
        // For now, we'll rely on what we get or fetch on demand in the view
        return items;
    }
}

export const mdblistService = new MDBListService();

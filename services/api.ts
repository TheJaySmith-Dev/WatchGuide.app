import { MediaItem, MediaDetail, Person, CollectionDetail } from '../types';

const TMDB_API_KEY = '09b97a49759876f2fde9eadb163edc44';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// --- Fallback Data (Prevents Blank Screen) ---
const FALLBACK_DATA: MediaItem[] = [
  {
    id: 438631,
    title: "Dune",
    overview: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
    poster_path: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    backdrop_path: "/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg",
    media_type: "movie",
    vote_average: 7.9,
    release_date: "2021-09-15"
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    poster_path: "/gEU2QniL6C8z19uVOtYnlzRLRgZ.jpg",
    backdrop_path: "/xJHokMBLkbke0N34kWWKA234TRz.jpg",
    media_type: "movie",
    vote_average: 8.4,
    release_date: "2014-11-05"
  },
  {
    id: 1399,
    name: "Game of Thrones",
    overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north.",
    poster_path: "/u3bZgnGQ9T01sWNhy95h0w6KSM0.jpg",
    backdrop_path: "/suopoADq0k8diQmJF20SVz7GqNw.jpg",
    media_type: "tv",
    vote_average: 8.4,
    first_air_date: "2011-04-17"
  },
  {
    id: 414906,
    title: "The Batman",
    overview: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    poster_path: "/74xTEgt7R36Fpooo50x9T2PC7VS.jpg",
    backdrop_path: "/tRS6jvPM9qPrrnx2KRp3ew96Yot.jpg",
    media_type: "movie",
    vote_average: 7.7,
    release_date: "2022-03-01"
  }
];

// --- Image Helpers ---

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=500&q=80';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// --- FanArt Integration ---
export const getFanArtLogo = async (type: 'movie' | 'tv', tmdbId: number): Promise<string | null> => {
  try {
    const data = await fetchTMDB<any>(`/${type}/${tmdbId}/images`, { include_image_language: 'en,null' });
    const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
    return logo ? `${IMAGE_BASE_URL}/original${logo.file_path}` : null;
  } catch (e) {
    return null;
  }
};

// --- TMDB Fetchers ---

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  try {
    const response = await fetch(`${BASE_URL}${endpoint}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`TMDB API Error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn(`Fetch failed for ${endpoint}:`, error);
    throw error;
  }
};

export const getTrending = async (): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>('/trending/all/day');
    const results = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
    return results.length > 0 ? results : FALLBACK_DATA;
  } catch (e) {
    return FALLBACK_DATA;
  }
};

export const getMovies = async (category: 'popular' | 'top_rated' | 'upcoming' | 'now_playing', region?: string): Promise<MediaItem[]> => {
  try {
    const params: Record<string, string> = {};
    if (region) params.region = region;
    
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/movie/${category}`, params);
    const results = (data.results || []).map(item => ({ ...item, media_type: 'movie' as const }));
    return results.length > 0 ? results : FALLBACK_DATA.filter(i => i.media_type === 'movie');
  } catch (e) {
    return FALLBACK_DATA.filter(i => i.media_type === 'movie');
  }
};

export const getTVShows = async (category: 'popular' | 'top_rated' | 'on_the_air'): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/tv/${category}`);
    const results = (data.results || []).map(item => ({ ...item, media_type: 'tv' as const }));
    return results.length > 0 ? results : FALLBACK_DATA.filter(i => i.media_type === 'tv');
  } catch (e) {
    return FALLBACK_DATA.filter(i => i.media_type === 'tv');
  }
};

export const searchMulti = async (query: string): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>('/search/multi', { query });
    return (data.results || []).filter(item => item.media_type !== 'person' && item.poster_path);
  } catch (e) {
    return [];
  }
};

export const searchPeople = async (query: string): Promise<Person[]> => {
  try {
    const data = await fetchTMDB<{ results: Person[] }>('/search/person', { query });
    return data.results || [];
  } catch { return [] }
};

export const getMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetail> => {
  try {
    return await fetchTMDB<MediaDetail>(`/${type}/${id}`, {
      append_to_response: 'credits,external_ids,images,videos,similar,recommendations,watch/providers'
    });
  } catch {
    // Return basic dummy detail if fetch fails
    const fallback = FALLBACK_DATA.find(i => i.id === id);
    return (fallback || FALLBACK_DATA[0]) as MediaDetail;
  }
};

export const getCollectionDetails = async (id: number): Promise<CollectionDetail> => {
  return fetchTMDB<CollectionDetail>(`/collection/${id}`);
};

export const getTrendingPeople = async (): Promise<Person[]> => {
  try {
    const data = await fetchTMDB<{ results: Person[] }>('/trending/person/week');
    return data.results || [];
  } catch { return [] }
};

export const getPersonDetails = async (id: number): Promise<Person> => {
  return fetchTMDB<Person>(`/person/${id}`, { append_to_response: 'combined_credits,external_ids,images' });
};

export const getRecommendations = async (type: 'movie' | 'tv', id: number): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/${type}/${id}/recommendations`);
    return (data.results || []).map(item => ({ ...item, media_type: type }));
  } catch { return []; }
};

export const getSimilarMedia = async (type: 'movie' | 'tv', id: number): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/${type}/${id}/similar`);
    return (data.results || []).map(item => ({ ...item, media_type: type }));
  } catch { return []; }
};
import { MediaItem, MediaDetail, Person, CollectionDetail } from '../types';

const TMDB_API_KEY = '09b97a49759876f2fde9eadb163edc44';
const FANART_API_KEY = '1d270eb9c6cff8abfe6c074eebba8d6f';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// --- Image Helpers ---

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=500&q=80'; // Better Fallback
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// --- FanArt Integration ---
export const getFanArtLogo = async (type: 'movie' | 'tv', tmdbId: number): Promise<string | null> => {
  try {
    const response = await fetch(`${BASE_URL}/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null`);
    if (!response.ok) return null;
    const data = await response.json();
    const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
    return logo ? `${IMAGE_BASE_URL}/original${logo.file_path}` : null;
  } catch (e) {
    console.warn("Error fetching logo", e);
    return null;
  }
};

// --- TMDB Fetchers ---

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const response = await fetch(`${BASE_URL}${endpoint}?${query.toString()}`);
  if (!response.ok) {
      throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const getTrending = async (): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>('/trending/all/day');
    return (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (e) {
      console.error("getTrending failed", e);
      return [];
  }
};

export const getMovies = async (category: 'popular' | 'top_rated' | 'upcoming' | 'now_playing'): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/movie/${category}`);
    return (data.results || []).map(item => ({ ...item, media_type: 'movie' }));
  } catch (e) {
      console.error(`getMovies ${category} failed`, e);
      return [];
  }
};

export const getTVShows = async (category: 'popular' | 'top_rated' | 'on_the_air'): Promise<MediaItem[]> => {
  try {
    const data = await fetchTMDB<{ results: MediaItem[] }>(`/tv/${category}`);
    return (data.results || []).map(item => ({ ...item, media_type: 'tv' }));
  } catch (e) {
      console.error(`getTVShows ${category} failed`, e);
      return [];
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
   const data = await fetchTMDB<{ results: Person[] }>('/search/person', { query });
   return data.results || [];
};

export const getMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetail> => {
  return fetchTMDB<MediaDetail>(`/${type}/${id}`, { 
      append_to_response: 'credits,external_ids,images,videos,similar,recommendations,watch/providers' 
  });
};

export const getCollectionDetails = async (id: number): Promise<CollectionDetail> => {
    return fetchTMDB<CollectionDetail>(`/collection/${id}`);
};

export const getTrendingPeople = async (): Promise<Person[]> => {
  const data = await fetchTMDB<{ results: Person[] }>('/trending/person/week');
  return data.results || [];
};

export const getPersonDetails = async (id: number): Promise<Person> => {
    return fetchTMDB<Person>(`/person/${id}`, { append_to_response: 'combined_credits,external_ids,images' });
}
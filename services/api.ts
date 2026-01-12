import { MediaItem, MediaDetail, Person, CollectionDetail } from '../types';

const TMDB_API_KEY = '09b97a49759876f2fde9eadb163edc44';
const FANART_API_KEY = '1d270eb9c6cff8abfe6c074eebba8d6f';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// --- Image Helpers ---

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://picsum.photos/500/750'; // Fallback
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// --- FanArt Integration ---
// Note: FanArt requires Client Key which is usually private, but we use the one provided.
// It also often requires specific IDs. We try to fetch logos.
export const getFanArtLogo = async (type: 'movie' | 'tv', tmdbId: number): Promise<string | null> => {
  try {
    // Using TMDB for logos (images endpoint)
    const response = await fetch(`${BASE_URL}/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null`);
    const data = await response.json();
    const logo = data.logos?.find((l: any) => l.iso_639_1 === 'en') || data.logos?.[0];
    return logo ? `${IMAGE_BASE_URL}/original${logo.file_path}` : null;
  } catch (e) {
    console.error("Error fetching logo", e);
    return null;
  }
};

// --- TMDB Fetchers ---

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const response = await fetch(`${BASE_URL}${endpoint}?${query.toString()}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const getTrending = async (): Promise<MediaItem[]> => {
  const data = await fetchTMDB<{ results: MediaItem[] }>('/trending/all/day');
  return data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
};

export const getMovies = async (category: 'popular' | 'top_rated' | 'upcoming' | 'now_playing'): Promise<MediaItem[]> => {
  const data = await fetchTMDB<{ results: MediaItem[] }>(`/movie/${category}`);
  return data.results.map(item => ({ ...item, media_type: 'movie' }));
};

export const getTVShows = async (category: 'popular' | 'top_rated' | 'on_the_air'): Promise<MediaItem[]> => {
  const data = await fetchTMDB<{ results: MediaItem[] }>(`/tv/${category}`);
  return data.results.map(item => ({ ...item, media_type: 'tv' }));
};

export const searchMulti = async (query: string): Promise<MediaItem[]> => {
  const data = await fetchTMDB<{ results: MediaItem[] }>('/search/multi', { query });
  return data.results.filter(item => item.media_type !== 'person' && item.poster_path); // Filter out people for main grid, or keep if needed
};

export const searchPeople = async (query: string): Promise<Person[]> => {
   const data = await fetchTMDB<{ results: Person[] }>('/search/person', { query });
   return data.results;
};

export const getMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetail> => {
  // Fetch extensive details: credits, images, videos, similar titles, watch providers, etc.
  return fetchTMDB<MediaDetail>(`/${type}/${id}`, { 
      append_to_response: 'credits,external_ids,images,videos,similar,recommendations,watch/providers' 
  });
};

export const getCollectionDetails = async (id: number): Promise<CollectionDetail> => {
    return fetchTMDB<CollectionDetail>(`/collection/${id}`);
};

export const getTrendingPeople = async (): Promise<Person[]> => {
  const data = await fetchTMDB<{ results: Person[] }>('/trending/person/week');
  return data.results;
};

export const getPersonDetails = async (id: number): Promise<Person> => {
    return fetchTMDB<Person>(`/person/${id}`, { append_to_response: 'combined_credits,external_ids,images' });
}

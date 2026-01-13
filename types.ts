export interface MediaItem {
  id: number;
  title?: string;
  name?: string; // For TV shows
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  media_type?: 'movie' | 'tv' | 'person';
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  character?: string; // For cast credits
  job?: string; // For crew credits
}

export interface Person {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for?: MediaItem[];
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  combined_credits?: {
    cast: MediaItem[];
    crew: MediaItem[];
  };
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
}

export interface Provider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface WatchProviders {
  results: {
    [key: string]: {
      link: string;
      flatrate?: Provider[];
      rent?: Provider[];
      buy?: Provider[];
    };
  };
}

export interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface CollectionDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: MediaItem[];
}

export interface MediaDetail extends MediaItem {
  credits?: Credits;
  runtime?: number;
  genres?: { id: number; name: string }[];
  tagline?: string;
  external_ids?: {
    imdb_id?: string;
    tvdb_id?: number;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
  };
  videos?: { results: Video[] };
  "watch/providers"?: WatchProviders;
  revenue?: number;
  budget?: number;
  belongs_to_collection?: Collection;
  similar?: { results: MediaItem[] };
  recommendations?: { results: MediaItem[] };
  homepage?: string;
}

// Gemini AI Types
export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  recommendations?: MediaItem[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

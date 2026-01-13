import React, { useEffect, useState } from 'react';
import { getTrending, getMovies, getTVShows, getRecommendations, getSimilarMedia } from '../services/api';
import { MediaItem } from '../types';
import HeroCarousel from '../components/HeroCarousel';
import ContentRow from '../components/ContentRow';
import { AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';

interface BrowseProps {
  onItemClick: (item: MediaItem) => void;
}

const Browse: React.FC<BrowseProps> = ({ onItemClick }) => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<MediaItem[]>([]);
  const [popularShows, setPopularShows] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [similarItems, setSimilarItems] = useState<{ title: string; items: MediaItem[] } | null>(null);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Basic rows
        const [trend, nowPlay, popShows, topRated] = await Promise.all([
          getTrending(),
          getMovies('now_playing'),
          getTVShows('popular'),
          getMovies('top_rated'),
        ]);

        setTrending(trend);
        setNowPlayingMovies(nowPlay);
        setPopularShows(popShows);
        setTopRatedMovies(topRated);

        // Personalized rows
        const likedItems = storageService.getList('liked');
        const watchedItems = storageService.getList('watched');

        const referenceItem = likedItems[likedItems.length - 1] || watchedItems[watchedItems.length - 1];

        if (referenceItem) {
          const [similar, recs] = await Promise.all([
            getSimilarMedia(referenceItem.media_type as 'movie' | 'tv', referenceItem.id),
            getRecommendations(referenceItem.media_type as 'movie' | 'tv', referenceItem.id)
          ]);

          if (similar.length > 0) {
            setSimilarItems({
              title: `Similar to ${referenceItem.title || referenceItem.name}`,
              items: similar
            });
          }
          if (recs.length > 0) {
            setRecommendations(recs);
          }
        }

      } catch (e) {
        console.error("Failed to load browse data", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Unable to load content</h1>
        <p className="text-gray-400 max-w-md">
          We're having trouble connecting. Please check your internet connection.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-indigo-600 rounded-full font-medium hover:bg-indigo-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Determine Hero Items: Use Trending, fallback to Now Playing, then Popular Shows
  const heroItems = trending.length > 0 ? trending.slice(0, 10) : (nowPlayingMovies.length > 0 ? nowPlayingMovies : popularShows);

  return (
    <div className="pb-24 md:pb-0">
      <HeroCarousel items={heroItems} onItemClick={onItemClick} />

      <div className="-mt-16 relative z-30 space-y-8 pb-10">
        {similarItems && (
          <ContentRow title={similarItems.title} items={similarItems.items} onItemClick={onItemClick} isPoster={true} />
        )}

        <ContentRow title="New Movies" items={nowPlayingMovies} onItemClick={onItemClick} isPoster={true} />

        {recommendations.length > 0 && (
          <ContentRow title="For You" items={recommendations} onItemClick={onItemClick} isPoster={false} />
        )}

        <ContentRow title="Popular TV Shows" items={popularShows} onItemClick={onItemClick} isPoster={false} />
        <ContentRow title="Critically Acclaimed Movies" items={topRatedMovies} onItemClick={onItemClick} isPoster={true} />
      </div>
    </div>
  );
};

export default Browse;
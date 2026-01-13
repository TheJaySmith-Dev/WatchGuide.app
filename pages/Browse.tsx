import React, { useEffect, useState } from 'react';
import { getTrending, getMovies, getTVShows, getRecommendations, getSimilarMedia, searchMulti } from '../services/api';
import { MediaItem } from '../types';
import HeroCarousel from '../components/HeroCarousel';
import ContentRow from '../components/ContentRow';
import { AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { storageService } from '../services/storage';
import { sendMessageToPoe } from '../services/poe';

interface BrowseProps {
  onItemClick: (item: MediaItem) => void;
}

const Browse: React.FC<BrowseProps> = ({ onItemClick }) => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<MediaItem[]>([]);
  const [popularShows, setPopularShows] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [similarItems, setSimilarItems] = useState<{ title: string; items: MediaItem[] } | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
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

        // Load cached AI recommendations
        const cached = storageService.getAIRecommendations();
        if (cached) {
          setAiRecommendations(cached.items);
        }

        // Personalized rows
        const likedItems = storageService.getList('liked');
        const watchedItems = storageService.getList('watched');

        const referenceItem = likedItems[likedItems.length - 1] || watchedItems[watchedItems.length - 1];

        if (referenceItem) {
          const similar = await getSimilarMedia(referenceItem.media_type as 'movie' | 'tv', referenceItem.id);

          if (similar.length > 0) {
            setSimilarItems({
              title: `Similar to ${referenceItem.title || referenceItem.name}`,
              items: similar
            });
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

  const handleLoadAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const liked = storageService.getList('liked').map(i => i.title || i.name).join(', ');
      const watched = storageService.getList('watched').map(i => i.title || i.name).join(', ');

      const prompt = `Based on my library, recommend 10 movies or TV shows I haven't seen yet. 
        Liked: ${liked}
        Watched: ${watched}
        Return ONLY a JSON array of strings (titles), e.g. ["Title 1", "Title 2"]. No other text.`;

      const response = await sendMessageToPoe([{ role: 'user', content: prompt }]);
      const titles = JSON.parse(response.replace(/```json|```/g, '').trim());

      const tmdbResults = await Promise.all(
        titles.map(async (title: string) => {
          const results = await searchMulti(title);
          return results[0];
        })
      );

      const validResults = tmdbResults.filter(Boolean) as MediaItem[];
      setAiRecommendations(validResults);
      storageService.setAIRecommendations(validResults);
    } catch (e) {
      console.error("AI Recommendation failed", e);
      alert("Failed to load AI recommendations. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

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

        {/* AI For You Row */}
        <div className="px-6 md:px-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              <h2 className="text-xl md:text-2xl font-black text-white">AI Powered For You</h2>
            </div>
            <button
              onClick={handleLoadAIRecommendations}
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 rounded-xl transition-all text-indigo-400 text-sm font-bold"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {aiRecommendations.length > 0 ? 'Refresh Picks' : 'Load For You'}
            </button>
          </div>

          {aiRecommendations.length > 0 ? (
            <ContentRow title="" items={aiRecommendations} onItemClick={onItemClick} isPoster={true} hideTitle={true} />
          ) : (
            <div className="h-48 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 group hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={handleLoadAIRecommendations}>
              <p className="text-gray-500 font-medium group-hover:text-indigo-400 transition-colors">Click to generate personalized picks based on your library</p>
            </div>
          )}
        </div>

        {similarItems && (
          <ContentRow title={similarItems.title} items={similarItems.items} onItemClick={onItemClick} isPoster={true} />
        )}

        <ContentRow title="New Movies" items={nowPlayingMovies} onItemClick={onItemClick} isPoster={true} />

        <ContentRow title="Popular TV Shows" items={popularShows} onItemClick={onItemClick} isPoster={false} />
        <ContentRow title="Critically Acclaimed Movies" items={topRatedMovies} onItemClick={onItemClick} isPoster={true} />
      </div>
    </div>
  );
};

export default Browse;
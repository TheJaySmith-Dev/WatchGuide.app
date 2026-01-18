import React, { useEffect, useState } from 'react';
import { getTrending, getMovies, getTVShows, getRecommendations, getSimilarMedia, searchMulti } from '../services/api';
import { MediaItem, TraktList, CustomListConfig } from '../types';
import HeroCarousel from '../components/HeroCarousel';
import ContentRow from '../components/ContentRow';
import ListDetailModal from '../components/ListDetailModal';
import { AlertCircle, Sparkles, Loader2, ListPlus } from 'lucide-react';
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
  const [customLists, setCustomLists] = useState<CustomListConfig[]>([]);
  const [viewingList, setViewingList] = useState<CustomListConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(false);

  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large'>('medium');

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
        const likedItems = await storageService.getList('liked');
        const watchedItems = await storageService.getList('watched');
        
        // Load custom lists
        setCustomLists(storageService.getCustomLists());

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

  const refreshLists = () => {
      setCustomLists(storageService.getCustomLists());
  };

  const handleLoadAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const likedItems = storageService.getListSync('liked');
      const watchedItems = storageService.getListSync('watched');

      if (likedItems.length === 0 && watchedItems.length === 0) {
        alert("Add some movies to your Liked or Watched lists first so the AI knows what you enjoy!");
        setAiLoading(false);
        return;
      }

      const liked = likedItems.map(i => i.title || i.name).join(', ');
      const watched = watchedItems.map(i => i.title || i.name).join(', ');

      const prompt = `Act as a movie discovery expert. I want 10 personalized recommendations (movies/TV) based on my tastes.
        
        MY LIBRARY:
        - Liked: ${liked}
        - Watched: ${watched}
        
        REQUIREMENTS:
        - Recommend titles I HAVEN'T watched/liked yet.
        - Mix it up: some popular hits and some hidden gems.
        - Provide ONLY a JSON array of strings (titles).
        - Format: ["Title 1", "Title 2", ...]
        - NO text before or after the JSON.`;

      const response = await sendMessageToPoe([{ role: 'user', content: prompt }]);

      // Robust JSON extraction
      let jsonStr = response;
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const titles = JSON.parse(jsonStr.trim());

      if (!Array.isArray(titles)) throw new Error("AI did not return an array");

      const tmdbResults = await Promise.all(
        titles.slice(0, 10).map(async (title: string) => {
          try {
            const results = await searchMulti(title);
            return results[0];
          } catch {
            return null;
          }
        })
      );

      const validResults = tmdbResults.filter(Boolean) as MediaItem[];

      if (validResults.length === 0) {
        throw new Error("No valid titles found on TMDB");
      }

      setAiRecommendations(validResults);
      storageService.setAIRecommendations(validResults);
    } catch (e) {
      console.error("AI Recommendation failed:", e);
      alert("AI is having a moment. Please try again or add more likes to your profile!");
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

  // Convert Custom Lists to MediaItem format for ContentRow
  const listThumbnails: MediaItem[] = customLists.map(list => {
      // Create a stable numeric ID from the string ID for the MediaItem interface
      let hash = 0;
      for (let i = 0; i < list.id.length; i++) {
          hash = (hash << 5) - hash + list.id.charCodeAt(i);
          hash |= 0;
      }
      const numericId = Math.abs(hash);

      return {
          id: numericId,
          title: list.customName,
          name: list.customName,
          poster_path: list.thumbnailUrl || null,
          backdrop_path: list.thumbnailUrl || null,
          overview: '',
          media_type: 'person', // Use 'person' or any type to pass validation, we handle click separately
          // Store original ID in a way we can retrieve it? 
          // Actually we can just find the list by numericId matching in the click handler if we replicate logic,
          // OR we can just find by title if unique, OR just trust the index if we pass index to click?
          // ContentRow passes the item back. We can attach the real ID as a custom property casted.
          realListId: list.id
      } as any;
  });

  return (
    <div className="pb-24 md:pb-0">
      <HeroCarousel items={heroItems} onItemClick={onItemClick} />

      <div className="-mt-16 relative z-30 space-y-8 pb-10">

        {/* AI For You Row - Only shows if 3+ items in library */}
        {(storageService.getListSync('liked').length + storageService.getListSync('watched').length) >= 3 && (
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
        )}

        {/* Custom Lists Row */}
        {listThumbnails.length > 0 && (
            <ContentRow 
                title="Your Lists" 
                items={listThumbnails} 
                onItemClick={(item: any) => {
                    const list = customLists.find(l => l.id === item.realListId);
                    if (list) setViewingList(list);
                }} 
                isPoster={false} // Use backdrop/landscape aspect ratio for lists
                disableHoverAnimation={true}
                thumbnailSize={thumbnailSize}
                headerContent={
                    <div className="flex bg-white/10 rounded-lg p-1 gap-1">
                        <button onClick={() => setThumbnailSize('small')} className={`p-1 rounded ${thumbnailSize === 'small' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Small">
                            <div className="w-3 h-3 bg-current rounded-sm" />
                        </button>
                        <button onClick={() => setThumbnailSize('medium')} className={`p-1 rounded ${thumbnailSize === 'medium' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Medium">
                            <div className="w-4 h-4 bg-current rounded-sm" />
                        </button>
                        <button onClick={() => setThumbnailSize('large')} className={`p-1 rounded ${thumbnailSize === 'large' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Large">
                            <div className="w-5 h-5 bg-current rounded-sm" />
                        </button>
                    </div>
                }
            />
        )}

        {similarItems && (
          <ContentRow title={similarItems.title} items={similarItems.items} onItemClick={onItemClick} isPoster={true} />
        )}

        <ContentRow title="New Movies" items={nowPlayingMovies} onItemClick={onItemClick} isPoster={true} />

        <ContentRow title="Popular TV Shows" items={popularShows} onItemClick={onItemClick} isPoster={false} />
        <ContentRow title="Critically Acclaimed Movies" items={topRatedMovies} onItemClick={onItemClick} isPoster={true} />
      </div>

      {viewingList && (
        <ListDetailModal 
            list={viewingList} 
            onClose={() => setViewingList(null)} 
            onItemClick={onItemClick}
            onListUpdated={() => {
                refreshLists();
                // Update viewing list ref
                const updated = storageService.getCustomLists().find(l => l.id === viewingList.id);
                if (updated) setViewingList(updated);
            }}
        />
      )}
    </div>
  );
};

export default Browse;
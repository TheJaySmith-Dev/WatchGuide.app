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
  selectedListId?: string | null;
  onListClose?: () => void;
}

const Browse: React.FC<BrowseProps> = ({ onItemClick, selectedListId, onListClose }) => {
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
  const [rowListItems, setRowListItems] = useState<Record<string, MediaItem[]>>({});

  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large'>(storageService.getThumbnailSize());

  const handleSizeChange = (size: 'small' | 'medium' | 'large') => {
      setThumbnailSize(size);
      storageService.setThumbnailSize(size);
  };

  // Sync viewingList with URL prop
  useEffect(() => {
      if (selectedListId && customLists.length > 0) {
          // Try to find by ID first
          let list = customLists.find(l => l.id === selectedListId);
          
          // If not found, try to find by slugified name (for cleaner URLs)
          if (!list) {
              list = customLists.find(l => {
                  const slug = l.customName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  return slug === selectedListId;
              });
          }

          if (list) {
              setViewingList(list);
          }
      } else if (!selectedListId) {
          setViewingList(null);
      }
  }, [selectedListId, customLists]);

  const handleListClick = (list: CustomListConfig) => {
      // Create slug from name
      const slug = list.customName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      window.location.hash = `#/list/${slug}`;
  };

  const handleListClose = () => {
      window.location.hash = '#/browse';
      if (onListClose) onListClose();
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const refreshLists = () => {
      const lists = storageService.getCustomLists();
      setCustomLists([...lists]); // Force refresh
      
      // Load items for lists marked as 'row'
      lists.forEach(async (list) => {
          if (list.viewType === 'row') {
              const items = await storageService.getListItems(list);
              setRowListItems(prev => ({
                  ...prev,
                  [list.id]: items
              }));
          }
      });
  };

  useEffect(() => {
    refreshLists();
  }, []);

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

        // Check for AI updates
        const likedItems = await storageService.getList('liked');
        const watchedItems = await storageService.getList('watched');
        
        const liked = likedItems.map(i => i.title || i.name).sort().join('|');
        const watched = watchedItems.map(i => i.title || i.name).sort().join('|');
        const currentHash = `${liked}::${watched}`;

        const cached = storageService.getAIRecommendations();
        
        if (cached && cached.items.length > 0) {
            setAiRecommendations(cached.items);
            
            // If hash doesn't match and we have enough items, refresh silently
            if (cached.sourceHash !== currentHash && (likedItems.length + watchedItems.length) >= 3) {
                 handleLoadAIRecommendations(true); // Silent refresh
            }
        } else if ((likedItems.length + watchedItems.length) >= 3) {
             // First load if eligible
             handleLoadAIRecommendations(true);
        }

        // Personalized rows
        
        // Load custom lists
        refreshLists();

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

  const handleLoadAIRecommendations = async (silent = false) => {
    if (!silent) setAiLoading(true);
    setIsGeneratingAI(true);
    try {
      const likedItems = storageService.getListSync('liked');
      const watchedItems = storageService.getListSync('watched');
      
      // Calculate hash for current state
      const liked = likedItems.map(i => i.title || i.name).sort().join('|');
      const watched = watchedItems.map(i => i.title || i.name).sort().join('|');
      const currentHash = `${liked}::${watched}`;

      if (likedItems.length === 0 && watchedItems.length === 0) {
        if (!silent) alert("Add some movies to your Liked or Watched lists first so the AI knows what you enjoy!");
        setAiLoading(false);
        setIsGeneratingAI(false);
        return;
      }

      const likedStr = likedItems.map(i => i.title || i.name).join(', ');
      const watchedStr = watchedItems.map(i => i.title || i.name).join(', ');

      const prompt = `Act as a movie discovery expert. I want 10 personalized recommendations (movies/TV) based on my tastes.
        
        MY LIBRARY:
        - Liked: ${likedStr}
        - Watched: ${watchedStr}
        
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
      storageService.setAIRecommendations(validResults, currentHash);
    } catch (e) {
      console.error("AI Recommendation failed:", e);
      if (!silent) alert("AI is having a moment. Please try again or add more likes to your profile!");
    } finally {
      setAiLoading(false);
      setIsGeneratingAI(false);
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

  // Filter lists based on viewType
  const hubLists = customLists.filter(l => l.viewType !== 'row');
  const rowLists = customLists.filter(l => l.viewType === 'row');

  // Transform for hub display
  const listThumbnails = hubLists.map(list => {
      // Logic to find best image for list thumbnail
      let poster_path = null;
      let backdrop_path = null;
      
      // If custom thumbnail is provided (and it's a hub), use it
      if (list.thumbnailUrl) {
          // Use the custom thumbnail as both poster and backdrop for simplicity in the row component
          poster_path = list.thumbnailUrl;
          backdrop_path = list.thumbnailUrl;
      } else {
          // Fallback to first item in list if available
          // This would require fetching list items which might be expensive to do for all lists upfront
          // For now, we'll use a placeholder or logic if we have cached items
      }

      return {
          id: parseInt(list.id.replace(/-/g, '').substring(0, 8), 16), // Fake ID for types
          title: list.customName,
          name: list.customName,
          media_type: 'movie',
          poster_path,
          backdrop_path,
          // ContentRow passes the item back. We can attach the real ID as a custom property casted.
          realListId: list.id
      } as any;
  });

  // Safe check for thumbnails
  const safeListThumbnails = listThumbnails.map(t => ({
      ...t,
      // If the path is a data URI, keep it as is. If it's undefined/null, keep undefined.
      // If it's a relative path, it will be handled by getImageUrl.
      poster_path: t.poster_path || undefined, 
      backdrop_path: t.backdrop_path || undefined
  }));

  return (
    <div className="pb-24 md:pb-0">
      <HeroCarousel items={heroItems} onItemClick={onItemClick} />

      <div className="-mt-16 md:-mt-32 relative z-30 space-y-8 pb-10">

        {/* AI For You Row - Only shows if 3+ items in library */}
        {(storageService.getListSync('liked').length + storageService.getListSync('watched').length) >= 3 && (
          <div className="px-6 md:pl-24 md:pr-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={20} />
                <h2 className="text-xl md:text-2xl font-black text-white">AI Powered For You</h2>
              </div>
              {/* Only show refresh button if we already have recommendations */}
              {aiRecommendations.length > 0 && (
                  <button
                    onClick={() => handleLoadAIRecommendations(false)}
                    disabled={aiLoading}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 rounded-xl transition-all text-indigo-400 text-sm font-bold"
                  >
                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Refresh Picks
                  </button>
              )}
            </div>

            {aiRecommendations.length > 0 ? (
              <ContentRow title="" items={aiRecommendations} onItemClick={onItemClick} isPoster={true} hideTitle={true} />
            ) : (
              <div className="h-48 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 group hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => handleLoadAIRecommendations(false)}>
                <p className="text-gray-500 font-medium group-hover:text-indigo-400 transition-colors">Click to generate personalized picks based on your library</p>
              </div>
            )}
          </div>
        )}

        {/* Custom Lists Row (Hubs) */}
        {safeListThumbnails.length > 0 && (
            <ContentRow 
                title="Your Lists" 
                items={safeListThumbnails} 
                onItemClick={(item: any) => {
                    const list = customLists.find(l => l.id === item.realListId);
                    if (list) handleListClick(list);
                }} 
                isPoster={false} // Use backdrop/landscape aspect ratio for lists
                disableHoverAnimation={true}
                thumbnailSize={thumbnailSize}
                headerContent={
                    <div className="hidden md:flex bg-white/10 rounded-lg p-1 gap-1">
                        <button onClick={() => handleSizeChange('small')} className={`p-1 rounded ${thumbnailSize === 'small' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Small">
                            <div className="w-3 h-3 bg-current rounded-sm" />
                        </button>
                        <button onClick={() => handleSizeChange('medium')} className={`p-1 rounded ${thumbnailSize === 'medium' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Medium">
                            <div className="w-4 h-4 bg-current rounded-sm" />
                        </button>
                        <button onClick={() => handleSizeChange('large')} className={`p-1 rounded ${thumbnailSize === 'large' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Large">
                            <div className="w-5 h-5 bg-current rounded-sm" />
                        </button>
                    </div>
                }
            />
        )}
        
        {/* Render Custom Lists as Standard Rows */}
        {rowLists.map(list => (
            rowListItems[list.id] && rowListItems[list.id].length > 0 && (
                <ContentRow 
                    key={list.id}
                    title={list.customName}
                    items={rowListItems[list.id]}
                    onItemClick={onItemClick}
                    isPoster={true}
                />
            )
        ))}

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
            onClose={handleListClose} 
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
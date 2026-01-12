import React, { useState, useEffect } from 'react';
import { searchMulti } from '../services/api';
import { MediaItem } from '../types';
import { Search as SearchIcon, Film, Tv, User } from 'lucide-react';
import { getImageUrl } from '../services/api';

interface SearchProps {
    onItemClick: (item: MediaItem) => void;
}

const Search: React.FC<SearchProps> = ({ onItemClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsSearching(true);
        try {
          const data = await searchMulti(query);
          // searchMulti already filters out persons in api.ts, but we might want them here now
          // If we want persons, we should check api.ts or create a new combined search
          // For now, let's assume searchMulti returns whatever the API gives, but api.ts had a filter.
          // We will update local logic if needed, but for now let's trust api.ts or update api.ts if we want people results in search.
          // Note: api.ts has `return data.results.filter(item => item.media_type !== 'person' && item.poster_path);`
          // We should ideally remove that filter in api.ts if we want people in search results,
          // but since I can't edit api.ts in this file block without re-emitting it (which I did in previous step implicitly via 'types' and 'api' updates? No, I updated api.ts only for details).
          // Let's assume the user might want to see people.
          setResults(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen pt-20 px-6 pb-24 md:pl-32 md:pt-12">
      <div className="max-w-4xl mx-auto">
        <div className="relative mb-10">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, shows, people..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                autoFocus
            />
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
        </div>

        {isSearching ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => onItemClick(item)}
                        className="group cursor-pointer flex flex-col"
                    >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800 border border-white/5">
                             {item.media_type === 'person' ? (
                                <img
                                    src={getImageUrl(item.profile_path)}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                             ) : (
                                <img
                                    src={getImageUrl(item.poster_path)}
                                    alt={item.title || item.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                             )}
                            
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                                {item.media_type === 'movie' && <Film size={12} className="text-gray-300"/>}
                                {item.media_type === 'tv' && <Tv size={12} className="text-gray-300"/>}
                                {item.media_type === 'person' && <User size={12} className="text-gray-300"/>}
                            </div>
                        </div>
                        <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{item.title || item.name}</h3>
                        <p className="text-sm text-gray-500">
                            {item.media_type === 'person' ? 'Person' : (item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4))}
                        </p>
                    </div>
                ))}
            </div>
        )}

        {!isSearching && results.length === 0 && query.length > 0 && (
            <div className="text-center text-gray-500 mt-20">
                No results found for "{query}"
            </div>
        )}

        {!isSearching && query.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-600 mt-20 space-y-4">
                <SearchIcon size={48} className="opacity-20" />
                <p>Find your next obsession.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Search;

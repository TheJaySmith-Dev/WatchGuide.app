import React, { useState, useEffect } from 'react';
import { searchMulti, getGenres, discoverMedia, getTrending, getFeaturedCollections, getImageUrl } from '../services/api';
import { MediaItem } from '../types';
import { Search as SearchIcon, Filter, X, TrendingUp, Library, Film, Tv, User } from 'lucide-react';

interface SearchProps {
    onItemClick: (item: MediaItem) => void;
}

const Search: React.FC<SearchProps> = ({ onItemClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Default Content
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [collections, setCollections] = useState<MediaItem[]>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [activeType, setActiveType] = useState<'movie' | 'tv'>('movie');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);

  // Load genres and default content
  useEffect(() => {
      getGenres(activeType).then(setGenres);
      
      // Load trending and collections only once
      if (trending.length === 0) {
          Promise.all([
              getTrending(),
              getFeaturedCollections()
          ]).then(([trend, coll]) => {
              setTrending(trend.slice(0, 10));
              setCollections(coll);
          });
      }
  }, [activeType]);

  // Handle Search & Filter Logic
  useEffect(() => {
    const fetchData = async () => {
        // Only search if there's a query OR active filters
        // If neither, we show the default view (handled in render)
        if (query.trim().length <= 2 && !selectedGenre && !selectedYear) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setResults([]);
        try {
            // Mode 1: Text Search (Overrides filters if query exists)
            if (query.trim().length > 2) {
                const data = await searchMulti(query);
                setResults(data);
            } 
            // Mode 2: Filter/Discover (Only if query is empty but filters active)
            else if (selectedGenre || selectedYear) {
                const data = await discoverMedia(activeType, {
                    genre: selectedGenre || undefined,
                    year: selectedYear || undefined,
                    sortBy: 'popularity.desc'
                });
                setResults(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, [query, activeType, selectedGenre, selectedYear]);

  // Generate Year Options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen pt-20 px-6 pb-24 md:pl-32 md:pt-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Search Bar & Filter Toggle */}
        <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search movies, shows, people..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                    autoFocus={!showFilters}
                />
                <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            </div>
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 rounded-2xl border transition-all flex items-center gap-2 ${showFilters || selectedGenre || selectedYear ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
            >
                <Filter size={20} />
                <span className="hidden md:inline">Filters</span>
            </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
            <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6 animate-in slide-in-from-top-4 fade-in duration-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Discover</h3>
                    {(selectedGenre || selectedYear) && (
                        <button 
                            onClick={() => { setSelectedGenre(null); setSelectedYear(null); }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Type Toggle */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                        <div className="flex p-1 bg-black/20 rounded-xl">
                            <button
                                onClick={() => setActiveType('movie')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeType === 'movie' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Movies
                            </button>
                            <button
                                onClick={() => setActiveType('tv')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeType === 'tv' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                TV Shows
                            </button>
                        </div>
                    </div>

                    {/* Genre Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Genre</label>
                        <select
                            value={selectedGenre || ''}
                            onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                        >
                            <option value="">All Genres</option>
                            {genres.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                        <select
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                        >
                            <option value="">Any Year</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        )}

        {/* Results or Default View */}
        {isSearching ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             </div>
        ) : results.length > 0 ? (
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
        ) : !query && !selectedGenre && !selectedYear ? (
            <div className="space-y-12 animate-in fade-in duration-500">
                {/* Featured Collections */}
                {collections.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Library className="text-indigo-400" size={24} />
                            <h2 className="text-xl font-bold text-white">Featured Collections</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {collections.slice(0, 4).map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => onItemClick(item)} // This needs to handle collection click properly
                                    className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer border border-white/10"
                                >
                                    <img 
                                        src={getImageUrl(item.backdrop_path || item.poster_path)} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt={item.name}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-4">
                                        <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{item.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trending Now */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-rose-400" size={24} />
                        <h2 className="text-xl font-bold text-white">Trending Now</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        {trending.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => onItemClick(item)}
                                className="group cursor-pointer flex flex-col"
                            >
                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800 border border-white/5 shadow-lg group-hover:shadow-rose-500/20 transition-all duration-300 group-hover:scale-[1.02]">
                                    <img 
                                        src={getImageUrl(item.poster_path)} 
                                        alt={item.title || item.name} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h3 className="font-medium text-white group-hover:text-rose-400 transition-colors line-clamp-1">{item.title || item.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 mt-20">
                No results found for "{query}"
            </div>
        )}
      </div>
    </div>
  );
};

export default Search;

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
        ) : null}

        {!isSearching && results.length === 0 && query.length === 0 && !selectedGenre && !selectedYear && (
            <div className="space-y-8 animate-in fade-in duration-500">
                
                {/* Bento Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[180px]">
                    
                    {/* Header Widget */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-4 row-span-1 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group cursor-default">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Discovery Hub</h2>
                            <p className="text-indigo-100 max-w-md">Explore trending movies, curated collections, and find your next favorite story.</p>
                        </div>
                        <SearchIcon className="absolute -right-8 -bottom-8 text-white/10 w-48 h-48 rotate-12" />
                    </div>

                    {/* Quick Filter: Action */}
                    <div 
                        onClick={() => setSelectedGenre(28)}
                        className="col-span-1 row-span-1 bg-gray-800 rounded-3xl p-6 relative overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                         <img src="https://image.tmdb.org/t/p/w500/path/to/action.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                         <span className="absolute bottom-4 left-4 font-bold text-lg text-white">Action</span>
                    </div>

                     {/* Quick Filter: Comedy */}
                     <div 
                        onClick={() => setSelectedGenre(35)}
                        className="col-span-1 row-span-1 bg-gray-800 rounded-3xl p-6 relative overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-600 opacity-80" />
                         <span className="absolute bottom-4 left-4 font-bold text-lg text-white">Comedy</span>
                         <span className="absolute top-4 right-4 text-4xl opacity-50">😂</span>
                    </div>

                    {/* Featured Collection: Large Tile (Star Wars/Avengers etc) */}
                    {collections.length > 0 && (
                        <div 
                            onClick={() => onItemClick(collections[0])}
                            className="col-span-2 row-span-2 rounded-3xl relative overflow-hidden cursor-pointer group"
                        >
                            <img 
                                src={getImageUrl(collections[0].backdrop_path || collections[0].poster_path)} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                alt={collections[0].name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">Featured Collection</span>
                                <h3 className="text-2xl font-bold text-white">{collections[0].name}</h3>
                            </div>
                        </div>
                    )}

                    {/* Trending Items (Small Tiles) */}
                    {trending.slice(0, 4).map((item) => (
                         <div 
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="col-span-1 row-span-2 rounded-3xl relative overflow-hidden cursor-pointer group"
                        >
                            <img 
                                src={getImageUrl(item.poster_path)} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                alt={item.title || item.name}
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="font-bold text-white text-sm line-clamp-2">{item.title || item.name}</p>
                             </div>
                        </div>
                    ))}

                    {/* Quick Filter: Sci-Fi */}
                    <div 
                        onClick={() => setSelectedGenre(878)}
                        className="col-span-1 row-span-1 bg-gray-800 rounded-3xl p-6 relative overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 opacity-80" />
                         <span className="absolute bottom-4 left-4 font-bold text-lg text-white">Sci-Fi</span>
                         <span className="absolute top-4 right-4 text-4xl opacity-50">👽</span>
                    </div>

                     {/* Quick Filter: Horror */}
                     <div 
                        onClick={() => setSelectedGenre(27)}
                        className="col-span-1 row-span-1 bg-gray-800 rounded-3xl p-6 relative overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-black opacity-90" />
                         <span className="absolute bottom-4 left-4 font-bold text-lg text-white">Horror</span>
                         <span className="absolute top-4 right-4 text-4xl opacity-50">👻</span>
                    </div>
                    
                    {/* More Collections */}
                     {collections.slice(1, 3).map(item => (
                        <div 
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="col-span-2 row-span-1 rounded-3xl relative overflow-hidden cursor-pointer group"
                        >
                            <img 
                                src={getImageUrl(item.backdrop_path || item.poster_path)} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                alt={item.name}
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-4 left-6">
                                <h3 className="text-lg font-bold text-white">{item.name}</h3>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        )}

        {!isSearching && results.length === 0 && query.length > 0 && (
            <div className="text-center text-gray-500 mt-20">
                No results found for "{query}"
            </div>
        )}
      </div>
    </div>
  );
};

export default Search;

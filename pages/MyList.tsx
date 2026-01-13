import React, { useEffect, useState } from 'react';
import { simklService } from '../services/simkl';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { Play, Clock, ChevronRight, LogIn } from 'lucide-react';

interface MyListProps {
    onItemClick: (item: MediaItem) => void;
}

const MyList: React.FC<MyListProps> = ({ onItemClick }) => {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const isAuthenticated = simklService.isAuthenticated();

    useEffect(() => {
        if (isAuthenticated) {
            setLoading(true);
            Promise.all([
                simklService.getWatchlist('movies', 'plantowatch'),
                simklService.getWatchlist('shows', 'plantowatch')
            ]).then(([movies, shows]) => {
                // Map Simkl items to TMDB-like MediaItems for compatibility
                const movieItems = movies.map(m => ({
                    id: m.movie.ids.tmdb,
                    title: m.movie.title,
                    poster_path: m.movie.poster,
                    media_type: 'movie' as const,
                    overview: '', // Simkl might not provide this in list view
                }));
                const showItems = shows.map(s => ({
                    id: s.show.ids.tmdb,
                    name: s.show.title,
                    poster_path: s.show.poster,
                    media_type: 'tv' as const,
                    overview: '',
                }));
                setWatchlist([...movieItems, ...showItems]);
            }).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                    <Clock size={40} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Your Watchlist</h2>
                <p className="text-gray-400 max-w-sm mb-8">
                    Connect your Simkl account to sync your watchlist and track your progress across all devices.
                </p>
                <button
                    onClick={() => window.location.href = simklService.getLoginUrl()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold transition-all"
                >
                    <LogIn size={20} />
                    Connect Simkl
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-white">My List</h1>
                <p className="text-gray-400 mt-2">Titles syncing from Simkl</p>
            </header>

            {watchlist.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                    <p className="text-gray-400">Your watchlist is empty. Add titles from Browse or Search!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {watchlist.map((item, idx) => (
                        <div
                            key={`${item.id}-${idx}`}
                            onClick={() => onItemClick(item)}
                            className="group cursor-pointer space-y-3"
                        >
                            <div className="aspect-[2/3] rounded-2xl overflow-hidden relative border border-white/10 shadow-lg">
                                <img
                                    src={getImageUrl(item.poster_path)}
                                    alt={item.title || item.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                        <Play size={24} fill="currentColor" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-sm truncate">{item.title || item.name}</h3>
                                <p className="text-gray-500 text-xs uppercase tracking-wider">{item.media_type}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyList;

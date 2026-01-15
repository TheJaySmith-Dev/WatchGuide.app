import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { storageService } from '../services/storage';
import { simklService } from '../services/simkl';
import { Trash2, Film, Tv, Heart } from 'lucide-react';

const MyList: React.FC = () => {
    const [activeList, setActiveList] = useState<'wantToWatch' | 'watched' | 'liked'>('wantToWatch');
    const [lists, setLists] = useState<{ wantToWatch: MediaItem[], watched: MediaItem[], liked: MediaItem[] }>({
        wantToWatch: [],
        watched: [],
        liked: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLists = async () => {
            if (simklService.isAuthenticated()) {
                await storageService.refresh();
                setLists({
                    wantToWatch: storageService.getListSync('wantToWatch'),
                    watched: storageService.getListSync('watched'),
                    liked: storageService.getListSync('liked')
                });
            }
            setLoading(false);
        };
        loadLists();
    }, []);

    const currentList = lists[activeList];

    const handleRemove = async (item: MediaItem) => {
        await storageService.toggleItem(activeList, item);
        // Refresh lists
        await storageService.refresh();
        setLists({
            wantToWatch: storageService.getListSync('wantToWatch'),
            watched: storageService.getListSync('watched'),
            liked: storageService.getListSync('liked')
        });
    };

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-white">My Library</h1>
                <p className="text-gray-400 mt-2">
                    {simklService.isAuthenticated()
                        ? 'Synced with Simkl'
                        : 'Please log in to Simkl to view your lists'}
                </p>
            </header>

            {/* List Selector Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
                <button
                    onClick={() => setActiveList('wantToWatch')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeList === 'wantToWatch'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    <Film size={18} />
                    <span>Want to Watch</span>
                    {lists.wantToWatch.length > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{lists.wantToWatch.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveList('watched')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeList === 'watched'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    <Tv size={18} />
                    <span>Watched</span>
                    {lists.watched.length > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{lists.watched.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveList('liked')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeList === 'liked'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    <Heart size={18} />
                    <span>Liked</span>
                    {lists.liked.length > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{lists.liked.length}</span>
                    )}
                </button>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="text-center text-gray-400 py-20">Loading...</div>
            ) : !simklService.isAuthenticated() ? (
                <div className="text-center text-gray-400 py-20">
                    <p>Please log in to Simkl from the More tab to view your lists</p>
                </div>
            ) : currentList.length === 0 ? (
                <div className="text-center text-gray-400 py-20">
                    <p>No items in this list yet</p>
                    <p className="text-sm mt-2">Add items from the Browse or Search pages</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {currentList.map(item => (
                        <div
                            key={item.id}
                            className="group relative bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all"
                        >
                            <img
                                src={getImageUrl(item.poster_path, 'w500')}
                                alt={item.title || item.name}
                                className="w-full aspect-[2/3] object-cover"
                            />
                            <button
                                onClick={() => handleRemove(item)}
                                className="absolute top-2 right-2 p-2 bg-rose-600/90 hover:bg-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} className="text-white" />
                            </button>
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-white line-clamp-2">
                                    {item.title || item.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyList;

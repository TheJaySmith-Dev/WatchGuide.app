import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { storageService } from '../services/storage';
import { simklService } from '../services/simkl';
import { traktService } from '../services/trakt';
import { mdblistService } from '../services/mdblist';
import { Trash2, Film, Tv, Heart, ChevronRight } from 'lucide-react';

interface MyListProps {
    onItemClick?: (item: MediaItem) => void;
}

const MyList: React.FC<MyListProps> = ({ onItemClick }) => {
    const [activeList, setActiveList] = useState<'planToWatch' | 'watched' | 'liked'>('planToWatch');
    const [lists, setLists] = useState<{ planToWatch: MediaItem[], watched: MediaItem[], liked: MediaItem[] }>({
        planToWatch: [],
        watched: [],
        liked: []
    });
    const [loading, setLoading] = useState(true);

    const [simklUser, setSimklUser] = useState<any>(null);
    const [traktUser, setTraktUser] = useState<any>(null);

    const isAuthenticated = simklService.isAuthenticated() || traktService.isAuthenticated() || mdblistService.isAuthenticated();

    useEffect(() => {
        const loadLists = async () => {
            console.log('Loading lists...', { simkl: simklService.isAuthenticated(), trakt: traktService.isAuthenticated() });
            setLoading(true);
            
            // Load user info for profile link
            if (simklService.isAuthenticated()) {
                const user = await simklService.getCurrentUser();
                setSimklUser(user);
            }
            if (traktService.isAuthenticated()) {
                const user = await traktService.getCurrentUser();
                setTraktUser(user);
            }
            
            await storageService.refresh();
            const newLists = {
                planToWatch: storageService.getListSync('planToWatch'),
                watched: storageService.getListSync('watched'),
                liked: storageService.getListSync('liked')
            };
            console.log('Lists loaded:', newLists);
            setLists(newLists);
            setLoading(false);
        };
        loadLists();
    }, []);

    const getSyncStatusText = () => {
        if (simklService.isAuthenticated() && traktService.isAuthenticated()) return 'Synced with Simkl & Trakt';
        if (simklService.isAuthenticated()) return 'Synced with Simkl';
        if (traktService.isAuthenticated()) return 'Synced with Trakt';
        if (mdblistService.isAuthenticated()) return 'Synced with MDBList';
        return 'Using local lists';
    };

    const handleRemove = async (item: MediaItem) => {
        await storageService.toggleItem(activeList, item);
        // Refresh lists
        await storageService.refresh();
        setLists({
            planToWatch: storageService.getListSync('planToWatch'),
            watched: storageService.getListSync('watched'),
            liked: storageService.getListSync('liked')
        });
    };

    const currentList = lists[activeList];

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-white">My Library</h1>
                <p className="text-gray-400 mt-2">
                    {getSyncStatusText()}
                </p>
            </header>

            {/* List Selector Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
                <button
                    onClick={() => setActiveList('planToWatch')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeList === 'planToWatch'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    <Film size={18} />
                    <span>Plan to Watch</span>
                    {lists.planToWatch.length > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{lists.planToWatch.length}</span>
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
            ) : !isAuthenticated ? (
                <div className="text-center text-gray-400 py-20">
                    <p>Please log in to Simkl or Trakt from the More tab to view your lists</p>
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
                            className="group relative bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all cursor-pointer"
                            onClick={() => onItemClick && onItemClick(item)}
                        >
                            <img
                                src={getImageUrl(item.poster_path, 'w500')}
                                alt={item.title || item.name}
                                className="w-full aspect-[2/3] object-cover"
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
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

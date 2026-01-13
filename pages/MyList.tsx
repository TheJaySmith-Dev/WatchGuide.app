import React, { useState } from 'react';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { Play, Heart, Check, Clock, ListPlus, Copy } from 'lucide-react';
import { storageService, ListType } from '../services/storage';

interface MyListProps {
    onItemClick: (item: MediaItem) => void;
}

const MyList: React.FC<MyListProps> = ({ onItemClick }) => {
    const [activeList, setActiveList] = useState<ListType>('wantToWatch');

    const lists: { id: ListType; label: string; icon: any; color: string }[] = [
        { id: 'wantToWatch', label: 'Want To Watch', icon: ListPlus, color: 'text-indigo-400' },
        { id: 'watched', label: 'Watched', icon: Check, color: 'text-green-400' },
        { id: 'liked', label: 'Liked', icon: Heart, color: 'text-rose-400' }
    ];

    const currentList = storageService.getList(activeList);

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32">
            <header className="mb-10 flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black text-white">My Library</h1>
                    <p className="text-gray-400 mt-2">Privacy-first local storage</p>
                </div>
                {currentList.length > 0 && (
                    <button
                        onClick={() => {
                            const items = storageService.getList(activeList);
                            const listText = items.map(item => `- ${item.title || item.name} (${item.media_type})`).join('\n');
                            const header = `My ${activeList.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} List:\n\n`;

                            navigator.clipboard.writeText(header + listText);
                            alert('List copied to clipboard as text!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-gray-400 hover:text-white text-sm font-medium"
                    >
                        <Copy size={16} />
                        <span>Copy List</span>
                    </button>
                )}
            </header>

            {/* List Selector Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
                {lists.map(list => {
                    const Icon = list.icon;
                    const isActive = activeList === list.id;
                    return (
                        <button
                            key={list.id}
                            onClick={() => setActiveList(list.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all shrink-0 font-medium ${isActive
                                ? 'bg-white/10 border-white/20 text-white shadow-xl'
                                : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Icon size={18} className={isActive ? list.color : ''} fill={isActive && list.id === 'liked' ? 'currentColor' : 'none'} />
                            <span>{list.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-600'}`}>
                                {storageService.getList(list.id).length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {currentList.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <Clock size={32} className="text-gray-600" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">Your list is empty</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Add titles from Browse or Search to start buildling your local library.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {currentList.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="group cursor-pointer space-y-3 animate-fade-in"
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

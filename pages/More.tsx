import React, { useEffect, useState } from 'react';
import { getTrendingPeople, getImageUrl } from '../services/api';
import { Person, TraktUser } from '../types';
import { ChevronRight, Globe, Settings, Check, X, LogIn, LogOut, User, Crown, RefreshCw, Timer, List, BrainCircuit, Sparkles, Database } from 'lucide-react';
import { storageService } from '../services/storage';
import { simklService } from '../services/simkl';
import { traktService } from '../services/trakt';
import { mdblistService } from '../services/mdblist';
import ListsPage from './ListsPage';

import GuideAIPage from './GuideAIPage';
import ReleaseNotesPage from './ReleaseNotesPage';

interface MoreProps {
    onPersonClick?: (id: number) => void;
    currentRegion: string;
    onRegionChange: (region: string) => void;
    simklUser?: any;
    traktUser?: TraktUser | null;
    onCountdownClick?: () => void;
    onListsToggle?: (isOpen: boolean) => void;
}

const regions = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'IN', name: 'India' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
];

const More: React.FC<MoreProps> = ({ onPersonClick, currentRegion, onRegionChange, simklUser, traktUser, onCountdownClick, onListsToggle }) => {
    const [people, setPeople] = useState<Person[]>([]);
    const [showRegions, setShowRegions] = useState(false);
    const [showLists, setShowLists] = useState(false);
    const [showGuideAI, setShowGuideAI] = useState(false);
    const [showReleaseNotes, setShowReleaseNotes] = useState(false);
    const [mdbAuthenticated, setMdbAuthenticated] = useState(false);

    useEffect(() => {
        getTrendingPeople().then(setPeople);
        setMdbAuthenticated(mdblistService.isAuthenticated());
    }, []);

    // Notify parent when lists view is toggled
    useEffect(() => {
        if (onListsToggle) {
            onListsToggle(showLists || showGuideAI || showReleaseNotes);
        }
    }, [showLists, showGuideAI, showReleaseNotes, onListsToggle]);

    const getRegionName = (code: string) => regions.find(r => r.code === code)?.name || code;

  if (showLists) {
    return <ListsPage 
      onBack={() => {
        setShowLists(false);
      }}
      onPersonClick={onPersonClick} 
      // Only pass lists that are NOT rows (i.e., hubs or undefined viewType)
      filter={(list: any) => list.viewType !== 'row'}
    />;
  }


    if (showGuideAI) {
        return <GuideAIPage onBack={() => setShowGuideAI(false)} />;
    }

    if (showReleaseNotes) {
        return <ReleaseNotesPage onBack={() => setShowReleaseNotes(false)} />;
    }

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32 md:pt-12 bg-[#050505]">

            {/* Subscriptions */}
            {/* Removed per user request */}

            {/* Features Section */}
            <div className="max-w-2xl mx-auto mb-8 relative">
                <h2 className="text-2xl font-bold text-white mb-6">Features</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowGuideAI(true)}
                        className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                                <BrainCircuit size={20} />
                            </div>
                            <span className="text-white">GuideAI Assistant</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                    <button
                        onClick={() => setShowLists(true)}
                        className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                <List size={20} />
                            </div>
                            <span className="text-white">Lists</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                    <button
                        onClick={onCountdownClick}
                        className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Timer size={20} />
                            </div>
                            <span className="text-white">Release Countdown</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Cloud Sync Section */}
            <div className="max-w-2xl mx-auto mb-8 relative">
                <h2 className="text-2xl font-bold text-white mb-6">Cloud Sync</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    {/* Simkl Integration */}
                    {simklUser ? (
                        <>
                            <div className="flex items-center gap-4">
                                <img
                                    src={simklUser.user.avatar}
                                    alt={simklUser.user.name}
                                    className="w-12 h-12 rounded-full border-2 border-indigo-500"
                                />
                                <div className="flex-1">
                                    <p className="text-white font-medium">{simklUser.user.name}</p>
                                    <p className="text-gray-400 text-sm">Connected to Simkl</p>
                                </div>
                                <button
                                    onClick={() => {
                                        simklService.logout();
                                        window.location.reload();
                                    }}
                                    className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 rounded-xl hover:bg-rose-600/30 transition-all text-rose-400 text-sm font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => simklService.initiateOAuth()}
                            className="w-full flex items-center justify-between p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 transition-all text-indigo-400 font-medium"
                        >
                            <span>Connect Simkl Account</span>
                            <ChevronRight size={18} />
                        </button>
                    )}

                    {/* Trakt Integration */}
                    {traktUser ? (
                        <>
                            <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                                <img
                                    src={traktUser.images?.avatar?.full || 'https://trakt.tv/assets/placeholders/default-user.png'}
                                    alt={traktUser.name || traktUser.username}
                                    className="w-12 h-12 rounded-full border-2 border-red-500"
                                />
                                <div className="flex-1">
                                    <p className="text-white font-medium">{traktUser.name || traktUser.username}</p>
                                    <p className="text-gray-400 text-sm">Connected to Trakt</p>
                                </div>
                                <button
                                    onClick={() => {
                                        traktService.logout();
                                        window.location.reload();
                                    }}
                                    className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 rounded-xl hover:bg-rose-600/30 transition-all text-rose-400 text-sm font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => traktService.initiateOAuth()}
                            className="w-full flex items-center justify-between p-4 bg-red-600/20 border border-red-500/30 rounded-xl hover:bg-red-600/30 transition-all text-red-400 font-medium"
                        >
                            <div className="flex items-center gap-3">
                                <img src="https://cdn.brandfetch.io/id-7yyc2jm/w/193/h/193/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" alt="Trakt" className="w-6 h-6 rounded-full" />
                                <span>Connect Trakt Account</span>
                            </div>
                            <ChevronRight size={18} />
                        </button>
                    )}

                    {/* MDBList Integration */}
                    {mdbAuthenticated ? (
                        <>
                            <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                                <img 
                                    src="https://mdblist.com/static/mdblist_logo.png" 
                                    alt="MDBList" 
                                    className="w-12 h-12 rounded-full border-2 border-pink-500 bg-white" 
                                />
                                <div className="flex-1">
                                    <p className="text-white font-medium">MDBList Connected</p>
                                    <p className="text-gray-400 text-sm">Access to your MDBList lists</p>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('mdblist_access_token');
                                        localStorage.removeItem('mdblist_refresh_token');
                                        setMdbAuthenticated(false);
                                        window.location.reload();
                                    }}
                                    className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 rounded-xl hover:bg-rose-600/30 transition-all text-rose-400 text-sm font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => mdblistService.initiateOAuth()}
                            className="w-full flex items-center justify-between p-4 bg-pink-600/20 border border-pink-500/30 rounded-xl hover:bg-pink-600/30 transition-all text-pink-400 font-medium"
                        >
                            <div className="flex items-center gap-3">
                                <img src="https://mdblist.com/static/mdblist_logo.png" alt="MDBList" className="w-6 h-6 rounded-full bg-white" />
                                <span>Connect MDBList Account</span>
                            </div>
                            <ChevronRight size={18} />
                        </button>
                    )}

                    <p className="text-gray-400 text-sm text-center">
                        Sync your watchlists across devices automatically using Simkl, Trakt, or MDBList.
                    </p>
                </div>
            </div>

            {/* Settings Section */}
            <div className="max-w-2xl mx-auto mb-12 relative">
                <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div
                        onClick={() => setShowRegions(true)}
                        className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Globe size={20} /></div>
                            <span className="text-white">Content Region</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <span>{getRegionName(currentRegion)}</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                    <button
                        onClick={() => setShowReleaseNotes(true)}
                        className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                <Sparkles size={20} />
                            </div>
                            <span className="text-white">What's New</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">v1.1.0</span>
                            <ChevronRight size={16} />
                        </div>
                    </button>
                    <a
                        href="/tos"
                        className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-500/20 rounded-lg text-gray-400">
                                <Settings size={20} />
                            </div>
                            <span className="text-white">Terms of Service</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </a>
                </div>
            </div>

            {/* Region Selection Modal/Overlay */}
            {showRegions && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-[#101010] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#101010] rounded-t-3xl z-10">
                            <h3 className="text-xl font-bold text-white">Select Region</h3>
                            <button onClick={() => setShowRegions(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                            {regions.map((region) => (
                                <button
                                    key={region.code}
                                    onClick={() => {
                                        onRegionChange(region.code);
                                        setShowRegions(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${currentRegion === region.code
                                        ? 'bg-indigo-600/20 border border-indigo-500/50'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{
                                            // Simple emoji flag lookup based on code could go here, for now just text
                                            // Using standard regional indicator symbol construction for flags
                                            region.code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))
                                        }</span>
                                        <span className={`font-medium ${currentRegion === region.code ? 'text-indigo-400' : 'text-gray-300'}`}>
                                            {region.name}
                                        </span>
                                    </div>
                                    {currentRegion === region.code && <Check size={20} className="text-indigo-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Trending People */}
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6">Trending People</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {people.map(person => (
                        <div
                            key={person.id}
                            onClick={() => onPersonClick && onPersonClick(person.id)}
                            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-all"
                        >
                            <img
                                src={getImageUrl(person.profile_path, 'w500')}
                                alt={person.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                                <h4 className="text-sm font-semibold text-white line-clamp-1">{person.name}</h4>
                                <span className="text-xs text-gray-400">{person.known_for_department}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default More;

import React, { useEffect, useState } from 'react';
import { getTrendingPeople, getImageUrl } from '../services/api';
import { Person } from '../types';
import { ChevronRight, Globe, Settings, Check, X, LogIn, LogOut, User } from 'lucide-react';
import { storageService } from '../services/storage';
import { copyToClipboard } from '../services/clipboard';

interface MoreProps {
    onPersonClick?: (id: number) => void;
    currentRegion: string;
    onRegionChange: (region: string) => void;
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

const More: React.FC<MoreProps> = ({ onPersonClick, currentRegion, onRegionChange }) => {
    const [people, setPeople] = useState<Person[]>([]);
    const [showRegions, setShowRegions] = useState(false);

    useEffect(() => {
        getTrendingPeople().then(setPeople);
    }, []);

    const getRegionName = (code: string) => regions.find(r => r.code === code)?.name || code;

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32 md:pt-12 bg-[#050505]">

            {/* Manual Sync Section */}
            <div className="max-w-2xl mx-auto mb-8 relative">
                <h2 className="text-2xl font-bold text-white mb-6">Manual Sync</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    <p className="text-gray-400 text-sm">
                        Privacy first: Your watchlists are stored only on this device.
                        To sync with another device, copy your sync code and paste it there.
                    </p>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={async () => {
                                const code = storageService.exportData();
                                const success = await copyToClipboard(code);
                                if (success) {
                                    alert('Sync code copied to clipboard!');
                                } else {
                                    alert('Failed to copy. Please try again.');
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 transition-all text-indigo-400 font-medium"
                        >
                            <span>Copy Sync Code</span>
                            <ChevronRight size={18} />
                        </button>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Import from another device</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Paste sync code here..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const code = (e.currentTarget as HTMLInputElement).value;
                                            if (storageService.importData(code)) {
                                                alert('Data imported successfully! Refreshing...');
                                                window.location.reload();
                                            } else {
                                                alert('Invalid sync code.');
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to delete all local watchlists? This cannot be undone.')) {
                            localStorage.removeItem('watchguide_user_data');
                            window.location.reload();
                        }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-rose-600/10 border border-rose-500/20 rounded-xl hover:bg-rose-600/20 transition-all text-rose-400 text-xs font-bold uppercase tracking-widest mt-4"
                >
                    <span>Reset All Local Data</span>
                    <X size={14} />
                </button>
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
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-500/20 rounded-lg text-gray-400"><Settings size={20} /></div>
                            <span className="text-white">Preferences</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </div>
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
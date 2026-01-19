import React from 'react';
import { Episode, Season } from '../types';
import { getImageUrl } from '../services/api';
import { X, Calendar, Clock, Star } from 'lucide-react';

interface SeasonViewProps {
    season: Season;
    episodes: Episode[];
    onClose: () => void;
}

const SeasonView: React.FC<SeasonViewProps> = ({ season, episodes, onClose }) => {
    return (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md animate-fade-in flex items-center justify-center p-0 md:p-8">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-50 backdrop-blur-sm transition-colors ring-1 ring-white/10"
            >
                <X size={24} />
            </button>

            <div className="w-full h-full md:max-w-4xl md:h-[85vh] bg-[#101010] md:rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 flex flex-col">
                
                {/* Header */}
                <div className="relative h-48 md:h-64 shrink-0">
                    <div className="absolute inset-0">
                        <img
                            src={getImageUrl(season.poster_path, 'original')}
                            alt={season.name}
                            className="w-full h-full object-cover opacity-40 blur-sm"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#101010]" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-6">
                        <img 
                            src={getImageUrl(season.poster_path)} 
                            className="w-24 md:w-32 rounded-lg shadow-2xl border border-white/20 hidden md:block"
                            alt={season.name}
                        />
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">{season.name}</h2>
                            <div className="flex items-center gap-4 text-gray-300 text-sm">
                                <span className="font-bold text-indigo-400">{episodes.length} Episodes</span>
                                <span>{season.air_date?.split('-')[0]}</span>
                                {season.vote_average > 0 && (
                                    <div className="flex items-center gap-1 text-green-400">
                                        <Star size={14} fill="currentColor" />
                                        <span>{season.vote_average.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Episodes List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {episodes.map(episode => (
                        <div 
                            key={episode.id}
                            className="flex flex-col md:flex-row gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
                        >
                            {/* Episode Image */}
                            <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                                <img 
                                    src={getImageUrl(episode.still_path)} 
                                    alt={episode.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-white">
                                    Ep {episode.episode_number}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors line-clamp-1">{episode.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            <span>{episode.air_date}</span>
                                        </div>
                                        {episode.runtime && (
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                <span>{episode.runtime}m</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{episode.overview || "No overview available."}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SeasonView;
import React, { useEffect, useState } from 'react';
import { MediaItem, MediaDetail } from '../types';
import { getMediaDetails, getImageUrl } from '../services/api';
import { storageService } from '../services/storage';
import { copyToClipboard } from '../services/clipboard';
import { X, Calendar, Star, Clock, Play, DollarSign, Users, Award, ExternalLink, Plus, Check, Heart } from 'lucide-react';
import ContentRow from './ContentRow';

interface MediaDetailViewProps {
    item: MediaItem;
    region: string;
    onClose: () => void;
    onItemClick: (item: MediaItem) => void;
    onPersonClick: (personId: number) => void;
    onCollectionClick: (collectionId: number) => void;
}

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ item, region, onClose, onItemClick, onPersonClick, onCollectionClick }) => {
    const [details, setDetails] = useState<MediaDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWnttToWatch, setIsWnttToWatch] = useState(storageService.isInList('wnttToWatch', item.id));
    const [isWatched, setIsWatched] = useState(storageService.isInList('watched', item.id));
    const [isLiked, setIsLiked] = useState(storageService.isInList('liked', item.id));
    const [showSyncPrompt, setShowSyncPrompt] = useState(false);

    // When item changes, reset details and fetch new ones
    useEffect(() => {
        setLoading(true);
        setDetails(null);
        setIsWnttToWatch(storageService.isInList('wnttToWatch', item.id));
        setIsWatched(storageService.isInList('watched', item.id));
        setIsLiked(storageService.isInList('liked', item.id));

        getMediaDetails(item.media_type as 'movie' | 'tv' || 'movie', item.id)
            .then((data) => {
                setDetails(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [item]);

    // Use loaded details or fallback to basic item info
    const displayItem = details || item;

    // Extract Data
    const trailer = details?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

    // Region Logic: Mirror UK (GB) content for South Africa (ZA) if requested, otherwise use selected region
    const providerRegionKey = region === 'ZA' ? 'GB' : region;
    const providers = details?.['watch/providers']?.results?.[providerRegionKey];

    const flatrate = providers?.flatrate || [];
    const rent = providers?.rent || [];
    const buy = providers?.buy || [];

    const directors = details?.credits?.crew?.filter(c => c.job === 'Director') || [];
    const cast = details?.credits?.cast?.slice(0, 15) || [];
    const similar = details?.recommendations?.results?.length
        ? details.recommendations.results
        : details?.similar?.results || [];

    const formatCurrency = (value?: number) => {
        if (!value) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(value);
    };

    const handleToggleList = async (type: 'planToWatch' | 'watched' | 'liked') => {
        const itemToStore = {
            id: item.id,
            title: item.title,
            name: item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            overview: item.overview,
            media_type: item.media_type || (details?.title ? 'movie' : 'tv'),
            vote_average: item.vote_average,
            release_date: item.release_date,
            first_air_date: item.first_air_date
        };

        const newState = await storageService.toggleItem(type, itemToStore);

        if (type === 'planToWatch') setIsPlanToWatch(newState);
        if (type === 'watched') setIsWatched(newState);
        if (type === 'liked') setIsLiked(newState);

        // Show sync prompt
        setShowSyncPrompt(true);
        setTimeout(() => setShowSyncPrompt(false), 3000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-0 md:p-8 overflow-hidden">
            {showSyncPrompt && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-2xl z-[110] animate-bounce text-sm font-bold flex items-center gap-3 ring-2 ring-white/20">
                    <div className="flex items-center gap-2">
                        <Check size={16} />
                        <span>Synced to Simkl!</span>
                    </div>
                </div>
            )}

            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-50 backdrop-blur-sm transition-colors ring-1 ring-white/10"
            >
                <X size={24} />
            </button>

            <div className="w-full h-full md:max-w-7xl md:h-[90vh] bg-black/40 md:rounded-3xl overflow-y-auto shadow-2xl relative border border-white/10 backdrop-blur-sm">

                {/* Hero Section */}
                <div className="relative h-[40vh] md:h-[50vh]">
                    <div className="absolute inset-0">
                        <img
                            src={getImageUrl(displayItem.backdrop_path, 'original')}
                            alt={displayItem.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col md:flex-row items-end gap-8">
                        {/* Poster */}
                        <div className="hidden md:block w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 transform translate-y-16">
                            <img src={getImageUrl(displayItem.poster_path)} className="w-full h-auto" alt="Poster" />
                        </div>

                        <div className="flex-1 mb-4 md:mb-0">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 leading-tight drop-shadow-xl">
                                {displayItem.title || displayItem.name}
                            </h1>
                            {details?.tagline && (
                                <p className="text-lg md:text-xl text-indigo-300 font-medium italic mb-4 drop-shadow-md">"{details.tagline}"</p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300">
                                {displayItem.vote_average && (
                                    <div className="flex items-center gap-1 text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded">
                                        <Star size={16} fill="currentColor" />
                                        <span>{(displayItem.vote_average * 10).toFixed(0)}% Match</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    <span>{displayItem.release_date?.split('-')[0] || displayItem.first_air_date?.split('-')[0] || 'N/A'}</span>
                                </div>
                                {details?.runtime && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} />
                                        <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
                            {trailer && (
                                <a href="#trailer" className="flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-white/10">
                                    <Play size={20} fill="currentColor" />
                                    Watch Trailer
                                </a>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleList('planToWatch')}
                                    title="Plan to Watch"
                                    className={`p-4 rounded-full border transition-all ${isPlanToWatch ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                                >
                                    <Plus size={20} className={isPlanToWatch ? 'rotate-45 transition-transform' : ''} />
                                </button>
                                <button
                                    onClick={() => handleToggleList('watched')}
                                    title="Watched"
                                    className={`p-4 rounded-full border transition-all ${isWatched ? 'bg-green-600 border-green-500 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                                >
                                    <Check size={20} />
                                </button>
                                <button
                                    onClick={() => handleToggleList('liked')}
                                    title="Like"
                                    className={`p-4 rounded-full border transition-all ${isLiked ? 'bg-rose-600 border-rose-500 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                                >
                                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-12 md:mt-8 bg-gradient-to-b from-black/80 to-black/95">

                    {/* Left Sidebar */}
                    <div className="md:col-span-3 space-y-8">
                        {/* Mobile Poster only */}
                        <div className="md:hidden w-32 rounded-lg overflow-hidden shadow-lg mb-6">
                            <img src={getImageUrl(displayItem.poster_path)} className="w-full h-auto" alt="Poster" />
                        </div>

                        {/* Streaming Info */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-6 shadow-xl">
                            <div>
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex justify-between items-center">
                                    <span>Stream</span>
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-500">{region}</span>
                                </h3>
                                {flatrate.length > 0 ? (
                                    <div className="flex flex-wrap gap-3">
                                        {flatrate.map(p => (
                                            <div key={p.provider_id} className="relative group cursor-help" title={p.provider_name}>
                                                <img
                                                    src={getImageUrl(p.logo_path, 'original')}
                                                    alt={p.provider_name}
                                                    className="w-12 h-12 rounded-xl object-cover"
                                                />
                                                <div className="absolute inset-0 ring-2 ring-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No streaming options found in {region}.</p>
                                )}
                            </div>

                            {(rent.length > 0 || buy.length > 0) && (
                                <div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Rent / Buy</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {[...rent, ...buy].filter((v, i, a) => a.findIndex(t => (t.provider_id === v.provider_id)) === i).slice(0, 5).map(p => (
                                            <div key={p.provider_id} className="relative group" title={p.provider_name}>
                                                <img
                                                    src={getImageUrl(p.logo_path, 'original')}
                                                    alt={p.provider_name}
                                                    className="w-10 h-10 rounded-lg object-cover opacity-80 hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {providers?.link && (
                                <a href={providers.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors">
                                    More Watch Options
                                </a>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="space-y-4">
                            {details?.budget && details.budget > 0 && (
                                <div>
                                    <h4 className="text-gray-500 text-xs uppercase font-bold">Budget</h4>
                                    <p className="text-white font-mono">{formatCurrency(details.budget)}</p>
                                </div>
                            )}
                            {details?.revenue && details.revenue > 0 && (
                                <div>
                                    <h4 className="text-gray-500 text-xs uppercase font-bold">Box Office</h4>
                                    <p className="text-green-400 font-mono">{formatCurrency(details.revenue)}</p>
                                </div>
                            )}
                            {directors.length > 0 && (
                                <div>
                                    <h4 className="text-gray-500 text-xs uppercase font-bold">Director</h4>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {directors.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => onPersonClick(d.id)}
                                                className="text-white text-sm border-b border-white/20 pb-0.5 hover:text-indigo-400 hover:border-indigo-400 transition-colors"
                                            >
                                                {d.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-9 space-y-10">
                        {/* Overview */}
                        <section>
                            <h3 className="text-2xl font-bold text-white mb-4">Storyline</h3>
                            <p className="text-gray-300 text-lg leading-relaxed font-light">
                                {displayItem.overview || "No detailed overview available."}
                            </p>
                        </section>

                        {/* Collection / Franchise */}
                        {details?.belongs_to_collection && (
                            <div
                                onClick={() => onCollectionClick(details.belongs_to_collection!.id)}
                                className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer border border-white/10"
                            >
                                <img
                                    src={getImageUrl(details.belongs_to_collection.backdrop_path, 'original')}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    alt={details.belongs_to_collection.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center px-8">
                                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">Collection</span>
                                    <h3 className="text-3xl font-bold text-white">{details.belongs_to_collection.name}</h3>
                                    <div className="flex items-center gap-2 mt-4 text-white font-bold text-sm">
                                        <span>View Franchise</span>
                                        <Play size={12} className="ml-1" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trailer Embed */}
                        {trailer && (
                            <section id="trailer" className="scroll-mt-24">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Play size={24} className="text-red-500" fill="currentColor" />
                                    Official Trailer
                                </h3>
                                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
                                        title={trailer.name}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>
                            </section>
                        )}

                        {/* Cast */}
                        {cast.length > 0 && (
                            <section>
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Users size={24} className="text-indigo-400" />
                                    Top Cast
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                    {cast.map(person => (
                                        <div
                                            key={person.id}
                                            className="snap-start shrink-0 w-32 group cursor-pointer"
                                            onClick={() => onPersonClick(person.id)}
                                        >
                                            <div className="w-32 h-32 rounded-full overflow-hidden mb-3 border-2 border-white/10 group-hover:border-indigo-500 transition-colors">
                                                <img
                                                    src={getImageUrl(person.profile_path, 'w500')}
                                                    alt={person.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <h4 className="text-white font-medium text-sm text-center truncate group-hover:text-indigo-400 transition-colors">{person.name}</h4>
                                            <p className="text-gray-500 text-xs text-center truncate">{person.character}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Similar Titles */}
                        {similar.length > 0 && (
                            <section className="pt-8 border-t border-white/5">
                                <ContentRow
                                    title="You Might Also Like"
                                    items={similar}
                                    isPoster={true}
                                    onItemClick={onItemClick}
                                />
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaDetailView;
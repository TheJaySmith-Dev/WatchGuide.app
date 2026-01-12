import React, { useEffect, useState } from 'react';
import { CollectionDetail, MediaItem } from '../types';
import { getCollectionDetails, getImageUrl } from '../services/api';
import { X, Film, Calendar, Star } from 'lucide-react';

interface CollectionDetailViewProps {
  collectionId: number;
  onClose: () => void;
  onItemClick: (item: MediaItem) => void;
}

const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({ collectionId, onClose, onItemClick }) => {
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCollectionDetails(collectionId)
      .then((data) => {
        setCollection(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [collectionId]);

  if (loading || !collection) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sort parts by release date
  const sortedParts = [...collection.parts]
    .filter(p => p.release_date)
    .sort((a, b) => new Date(a.release_date!).getTime() - new Date(b.release_date!).getTime());

  // Parts without release date or poster are pushed to end or filtered if needed, keeping them for now
  const finalParts = [...sortedParts, ...collection.parts.filter(p => !p.release_date)];

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-0 md:p-8 overflow-hidden">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-50 backdrop-blur-sm transition-colors ring-1 ring-white/10"
      >
        <X size={24} />
      </button>

      <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-black/40 md:rounded-3xl overflow-y-auto shadow-2xl relative border border-white/10 flex flex-col backdrop-blur-sm">
        
        {/* Header Section - Reduced Height */}
        <div className="relative h-[30vh] md:h-[35vh] shrink-0">
             <div className="absolute inset-0">
                <img 
                    src={getImageUrl(collection.backdrop_path, 'original')} 
                    alt={collection.name} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
             </div>
             <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col justify-end">
                 <h1 className="text-2xl md:text-4xl font-black text-white mb-2 drop-shadow-xl">{collection.name}</h1>
                 <p className="text-gray-200 max-w-3xl text-sm md:text-base leading-relaxed drop-shadow-md line-clamp-2 hidden md:block mb-3">
                     {collection.overview}
                 </p>
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                     <Film size={14} />
                     <span>{collection.parts.length} Movies</span>
                 </div>
             </div>
        </div>

        {/* Movies Grid - Moved up with padding adjustment */}
        <div className="flex-1 p-6 md:px-10 md:py-8 overflow-y-auto bg-gradient-to-b from-black/80 to-transparent">
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {finalParts.map((part) => (
                    <div 
                        key={part.id}
                        onClick={() => onItemClick({ ...part, media_type: 'movie' })}
                        className="group cursor-pointer flex flex-col"
                    >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800 border border-white/5">
                            <img
                                src={getImageUrl(part.poster_path)}
                                alt={part.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                            {part.release_date && (
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-bold">
                                    {part.release_date.split('-')[0]}
                                </div>
                            )}
                            {part.vote_average && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-green-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-bold">
                                    <Star size={10} fill="currentColor" />
                                    {part.vote_average.toFixed(1)}
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-200 text-sm group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {part.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{part.overview}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetailView;
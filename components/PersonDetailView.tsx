import React, { useEffect, useState } from 'react';
import { Person, MediaItem } from '../types';
import { getPersonDetails, getImageUrl } from '../services/api';
import { X, MapPin, Calendar, Star, Film, Tv } from 'lucide-react';

interface PersonDetailViewProps {
  personId: number;
  onClose: () => void;
  onMediaClick: (item: MediaItem) => void;
}

const PersonDetailView: React.FC<PersonDetailViewProps> = ({ personId, onClose, onMediaClick }) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPersonDetails(personId)
      .then((data) => {
        setPerson(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [personId]);

  if (loading || !person) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter and sort credits
  const castCredits = person.combined_credits?.cast || [];
  const sortedCredits = [...castCredits]
    .filter(item => item.poster_path && item.vote_average && item.vote_average > 0)
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)); // Sort by rating for "Known For" feel

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-0 md:p-8 overflow-hidden">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-50 backdrop-blur-sm transition-colors ring-1 ring-white/10"
      >
        <X size={24} />
      </button>

      <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-black/40 md:rounded-3xl overflow-y-auto shadow-2xl relative border border-white/10 flex flex-col md:flex-row backdrop-blur-sm">
        
        {/* Sidebar Info */}
        <div className="w-full md:w-1/3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 bg-black/20">
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl mb-8 mx-auto md:mx-0">
                <img 
                    src={getImageUrl(person.profile_path, 'w500')} 
                    alt={person.name} 
                    className="w-full h-full object-cover"
                />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center md:text-left">{person.name}</h1>
            <p className="text-indigo-400 font-medium mb-6 text-center md:text-left">{person.known_for_department}</p>
            
            <div className="space-y-4 text-sm text-gray-400 mb-8">
                {person.birthday && (
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                        <Calendar size={18} />
                        <span>{person.birthday}</span>
                    </div>
                )}
                {person.place_of_birth && (
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                        <MapPin size={18} />
                        <span>{person.place_of_birth}</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-white font-bold uppercase text-xs tracking-wider">Biography</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {person.biography || "No biography available."}
                </p>
            </div>
        </div>

        {/* Filmography Grid */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-transparent">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <Film className="text-indigo-500" />
                Filmography
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {sortedCredits.map((credit) => (
                    <div 
                        key={`${credit.id}-${credit.media_type}`}
                        onClick={() => onMediaClick(credit)}
                        className="group cursor-pointer flex flex-col"
                    >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gray-800 border border-white/5">
                            <img
                                src={getImageUrl(credit.poster_path)}
                                alt={credit.title || credit.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-bold uppercase">
                                {credit.media_type === 'tv' ? 'TV' : 'Movie'}
                            </div>
                            {credit.vote_average && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-green-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-bold">
                                    <Star size={10} fill="currentColor" />
                                    {credit.vote_average.toFixed(1)}
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-200 text-sm line-clamp-1 group-hover:text-indigo-400 transition-colors">
                            {credit.title || credit.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">
                            {credit.character ? `as ${credit.character}` : ''}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailView;
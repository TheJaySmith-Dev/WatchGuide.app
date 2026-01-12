import React, { useRef } from 'react';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  isPoster?: boolean; // If true, vertical poster. If false, horizontal backdrop card.
  onItemClick: (item: MediaItem) => void;
}

const ContentRow: React.FC<ContentRowProps> = ({ title, items, isPoster = true, onItemClick }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { current } = rowRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth * 0.8 : current.offsetWidth * 0.8;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="py-2 space-y-4 group/row">
      {/* Header title aligned with content start */}
      <div className="flex items-center justify-between px-6 md:pl-40 md:pr-12">
        <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">{title}</h2>
        <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button onClick={() => scroll('left')} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
            <button onClick={() => scroll('right')} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Scroll container bleeds to edges on desktop (px-0) */}
      <div 
        ref={rowRef}
        className="flex gap-4 overflow-x-auto px-6 md:px-0 hide-scrollbar pb-4 snap-x snap-mandatory"
      >
        {items.map((item, index) => {
          // Calculate spacing classes based on index
          const spacingClass = index === 0 ? 'md:ml-40' : index === items.length - 1 ? 'md:mr-12' : '';
          const sizeClass = isPoster ? 'w-[140px] md:w-[200px]' : 'w-[260px] md:w-[350px]';
          
          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`flex-none relative cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-10 snap-center ${sizeClass} ${spacingClass}`}
            >
              <div className={`relative overflow-hidden rounded-lg ${isPoster ? 'aspect-[2/3]' : 'aspect-video'}`}>
                  <img
                      src={getImageUrl(isPoster ? item.poster_path : item.backdrop_path, 'w500')}
                      alt={item.title || item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  
                  {/* Fallback Title Overlay if image fails or just as style */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                      <h3 className="text-sm font-bold text-white line-clamp-2">{item.title || item.name}</h3>
                      {item.vote_average && (
                          <span className="text-xs text-green-400 font-medium mt-1">{(item.vote_average * 10).toFixed(0)}% Match</span>
                      )}
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentRow;
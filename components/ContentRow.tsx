import React, { useRef } from 'react';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  isPoster?: boolean;
  onItemClick: (item: MediaItem) => void;
  hideTitle?: boolean;
  headerContent?: React.ReactNode;
  disableHoverAnimation?: boolean;
  thumbnailSize?: 'small' | 'medium' | 'large';
}

const ContentRow: React.FC<ContentRowProps> = ({ 
    title, 
    items, 
    isPoster = true, 
    onItemClick, 
    hideTitle = false, 
    headerContent,
    disableHoverAnimation = false,
    thumbnailSize = 'medium'
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { current } = rowRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth * 0.8 : current.offsetWidth * 0.8;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Safe check
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  
  const getSizeClass = () => {
      if (isPoster) {
          switch(thumbnailSize) {
              case 'small': return 'w-[100px] md:w-[140px]';
              case 'large': return 'w-[180px] md:w-[260px]';
              default: return 'w-[140px] md:w-[200px]';
          }
      } else {
          switch(thumbnailSize) {
              case 'small': return 'w-[200px] md:w-[280px]';
              case 'large': return 'w-[320px] md:w-[450px]';
              default: return 'w-[260px] md:w-[350px]';
          }
      }
  };

  return (
    <div className="py-2 space-y-4 group/row">
      {!hideTitle && (
        <div className="flex items-center justify-between px-6 md:pl-24 md:pr-12">
          <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">{title}</h2>
            {headerContent}
          </div>
          <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button onClick={() => scroll('left')} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
            <button onClick={() => scroll('right')} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto px-6 md:px-0 hide-scrollbar pb-4 snap-x snap-mandatory"
      >
        {items.map((item, index) => {
          // Explicitly construct className to avoid template literal issues
          let className = `flex-none relative cursor-pointer group transition-all duration-300 snap-center ${getSizeClass()} `;
          
          if (!disableHoverAnimation) {
              className += "hover:scale-105 hover:z-10 ";
          }

          if (index === 0) className += "md:ml-24 ";
          if (index === items.length - 1) className += "md:mr-12 ";

          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={className.trim()}
            >
              <div className={`relative overflow-hidden rounded-lg ${isPoster ? 'aspect-[2/3]' : 'aspect-video'}`}>
                <img
                  src={getImageUrl(isPoster ? item.poster_path : item.backdrop_path, 'w500')}
                  alt={item.title || item.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${!disableHoverAnimation ? 'group-hover:scale-110' : ''}`}
                  loading="lazy"
                />
                <div className={`absolute inset-0 bg-black/0 transition-colors ${!disableHoverAnimation ? 'group-hover:bg-black/20' : ''}`} />

                <div className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 transition-opacity flex flex-col justify-end ${!disableHoverAnimation ? 'group-hover:opacity-100' : 'group-hover:opacity-100'}`}>
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
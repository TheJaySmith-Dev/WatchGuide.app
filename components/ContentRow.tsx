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

  // Special logic for "Trending" rows to override the first item's image
  // REVERTED: We are now overlaying the image instead of replacing the poster
  const displayItems = items; 

  return (
    <div className="group/row relative">
      {!hideTitle && (
        <div className="flex items-center justify-between mb-4 px-6 md:px-12">
          <h2 className="text-xl font-bold text-white group-hover/row:text-indigo-400 transition-colors">{title}</h2>
          {headerContent}
        </div>
      )}
      
      <div className="relative group">
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
        >
          <ChevronLeft className="text-white" size={32} />
        </button>

        <div 
          ref={rowRef}
          className="flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-8 ml-6 md:ml-24 py-8 hide-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {displayItems.map((item, index) => (
            <div 
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`snap-start shrink-0 relative transition-all duration-300 cursor-pointer group/card ${
                disableHoverAnimation ? '' : 'hover:scale-105 hover:z-10'
              } ${
                isPoster 
                  ? thumbnailSize === 'large' ? 'w-48 md:w-60' : thumbnailSize === 'small' ? 'w-28 md:w-36' : 'w-36 md:w-44'
                  : thumbnailSize === 'large' ? 'w-80 md:w-96' : thumbnailSize === 'small' ? 'w-40 md:w-60' : 'w-64 md:w-80'
              }`}
            >
              <div className={`rounded-xl overflow-hidden shadow-lg border border-white/5 bg-gray-800 ${isPoster ? 'aspect-[2/3]' : 'aspect-video'}`}>
                <img 
                  src={getImageUrl(item.poster_path || item.backdrop_path, 'w500')} 
                  alt={item.title || item.name} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Rank Overlay for Trending Row */}
                {title === 'Trending Now' && index < 10 && (
                    <div className="absolute -bottom-2 -left-2 z-20 pointer-events-none">
                        <span 
                            className="text-[5rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-t from-gray-500 via-gray-200 to-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-sans translate-y-2"
                            style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.5)' }}
                        >
                            {index + 1}
                        </span>
                    </div>
                )}
              </div>
              {!isPoster && (
              <div className="mt-2">
                <h3 className="text-sm font-medium text-gray-200 truncate group-hover/card:text-white transition-colors">
                  {item.title || item.name}
                </h3>
              </div>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="text-white" size={32} />
        </button>
      </div>
    </div>
  );
};

export default ContentRow;

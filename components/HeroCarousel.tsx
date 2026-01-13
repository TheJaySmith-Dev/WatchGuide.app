import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { getImageUrl, getFanArtLogo } from '../services/api';

interface HeroCarouselProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onItemClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items]);

  const activeItem = items && items.length > 0 ? items[activeIndex] : null;

  useEffect(() => {
    if (activeItem) {
      setLogoUrl(null);
      getFanArtLogo(activeItem.media_type as 'movie' | 'tv' || 'movie', activeItem.id)
        .then(setLogoUrl);
    }
  }, [activeItem]);

  // If no items are passed at all, show a graceful placeholder instead of a skeleton
  if (!activeItem) {
    return (
      <div className="relative h-[65vh] md:h-[85vh] w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-600 font-medium">No featured content available</div>
      </div>
    );
  }

  return (
    <div
      className="relative h-[65vh] md:h-[85vh] w-full overflow-hidden group cursor-pointer"
      onClick={() => onItemClick(activeItem)}
    >
      {/* Background Image Layer */}
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
        >
          <img
            src={getImageUrl(item.backdrop_path, 'original')}
            alt={item.title || item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent md:via-[#050505]/20" />
        </div>
      ))}

      {/* Content Layer */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end pb-32 px-6 md:pl-40 md:pr-24 md:pb-40 md:items-start text-left">
        <div className={`transition-all duration-1000 transform ${logoUrl ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 md:h-24 lg:h-32 object-contain mb-8 md:mb-10 origin-left drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          ) : (
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-xl max-w-2xl leading-tight tracking-tight">
              {activeItem.title || activeItem.name}
            </h1>
          )}
        </div>

        <p className="text-gray-200/90 line-clamp-2 md:line-clamp-3 max-w-md md:max-w-xl text-sm md:text-lg font-normal drop-shadow-lg leading-relaxed">
          {activeItem.overview}
        </p>
      </div>
    </div>
  );
};

export default HeroCarousel;
import React, { useState, useEffect, useRef } from 'react';
import { MediaItem } from '../types';
import { getImageUrl, getFanArtLogo, getVideos } from '../services/api';
import { Volume2, VolumeX, Play } from 'lucide-react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface HeroCarouselProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onItemClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timer when activeIndex changes
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false); // Reset playing state
  }, [activeIndex]);

  // Initial Auto-Advance (fallback) logic handled in the video effect
  
  const activeItem = items && items.length > 0 ? items[activeIndex] : null;

  const nextSlide = () => {
      setActiveIndex((prev) => (prev + 1) % items.length);
  };

  useEffect(() => {
    if (activeItem) {
      setLogoUrl(null);
      setVideoKey(null);
      
      // Start a fallback timer in case video doesn't load or exist
      // We'll clear this if a video is found and starts playing
      timerRef.current = setTimeout(nextSlide, 10000); 

      // Fetch Logo
      getFanArtLogo(activeItem.media_type as 'movie' | 'tv' || 'movie', activeItem.id)
        .then(setLogoUrl);

      // Fetch Trailer
      getVideos(activeItem.media_type as 'movie' | 'tv' || 'movie', activeItem.id)
        .then(videos => {
            const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || 
                            videos.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube');
            if (trailer) {
                setVideoKey(trailer.key);
                // If we found a video, we rely on the player events (onEnd/onError) 
                // BUT we keep the timer until the player actually reports "playing" or "ready"
                // to avoid getting stuck on a loading spinner.
                // Actually, safer to clear it only on 'onPlay' or 'onReady'.
            }
        });
    }
    
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeItem]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    
    // Always try to play immediately when ready
    event.target.playVideo();

    // Attempt to respect the current mute state
    if (isMuted) {
        event.target.mute();
    } else {
        event.target.unMute();
    }
    
    // Clear fallback timer as we are ready to play
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
      // 1 = playing, 0 = ended, -1 = unstarted, 2 = paused, 3 = buffering, 5 = cued
      if (event.data === 1) { // Playing
          setIsPlaying(true);
          if (timerRef.current) clearTimeout(timerRef.current);
      }
      if (event.data === 0) { // Ended
          nextSlide();
      }
      if (event.data === -1 || event.data === 5) { // Unstarted or Cued
          // Try to force play if it gets stuck here
          event.target.playVideo();
      }
  };

  const onPlayerError: YouTubeProps['onError'] = () => {
      // If video fails, trigger next slide immediately
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimeout(nextSlide, 2000);
  };

  const handleControlClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!playerRef.current) return;

      if (!isPlaying) {
          // If not playing, this acts as a "Play" button
          // We also unmute because user interaction implies they want to hear it
          setIsMuted(false);
          playerRef.current.unMute();
          playerRef.current.playVideo();
      } else {
          // If playing, this acts as a Mute toggle
          const newMuted = !isMuted;
          setIsMuted(newMuted);
          if (newMuted) {
              playerRef.current.mute();
          } else {
              playerRef.current.unMute();
          }
      }
  };

  // If no items are passed at all, show a graceful placeholder
  if (!activeItem) {
    return (
      <div className="relative h-[65vh] md:h-[85vh] w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-600 font-medium">No featured content available</div>
      </div>
    );
  }

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3, // Hide annotations
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      mute: isMuted ? 1 : 0,
      origin: window.location.origin
    },
  };

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
            className={`w-full h-full object-cover transition-opacity duration-1000 ${index === activeIndex && isPlaying ? 'opacity-0' : 'opacity-100'}`}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent md:via-[#050505]/20" />
        </div>
      ))}

      {/* Persistent Video Layer */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          {videoKey && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] md:w-[150%] md:h-[150%] opacity-80">
                <YouTube
                    videoId={videoKey}
                    opts={opts}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                    onEnd={nextSlide}
                    onError={onPlayerError}
                    className="w-full h-full"
                    iframeClassName="w-full h-full"
                />
            </div>
          )}
      </div>

      {/* Mute/Play Button */}
      <div className="absolute top-24 right-6 md:top-32 md:right-12 z-50">
          <button 
            onClick={handleControlClick}
            className="p-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all flex items-center justify-center"
          >
              {!isPlaying ? (
                  <Play size={24} className="ml-1" /> // Offset slightly for visual balance
              ) : (
                  isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />
              )}
          </button>
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end pb-32 px-6 md:pl-40 md:pr-24 md:pb-40 md:items-start text-left">
        <div className={`transition-all duration-1000 transform ${logoUrl ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 md:h-16 lg:h-20 object-contain mb-8 md:mb-10 origin-left drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          ) : (
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-xl max-w-2xl leading-tight tracking-tight">
              {activeItem.title || activeItem.name}
            </h1>
          )}
        </div>

        <p className={`text-gray-200/90 line-clamp-2 md:line-clamp-3 max-w-md md:max-w-xl text-sm md:text-lg font-normal drop-shadow-lg leading-relaxed transition-opacity duration-1000 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
          {activeItem.overview}
        </p>
      </div>
    </div>
  );
};

export default HeroCarousel;
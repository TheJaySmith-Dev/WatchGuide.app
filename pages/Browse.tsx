import React, { useEffect, useState } from 'react';
import { getTrending, getMovies, getTVShows } from '../services/api';
import { MediaItem } from '../types';
import HeroCarousel from '../components/HeroCarousel';
import ContentRow from '../components/ContentRow';

interface BrowseProps {
  onItemClick: (item: MediaItem) => void;
}

const Browse: React.FC<BrowseProps> = ({ onItemClick }) => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<MediaItem[]>([]);
  const [popularShows, setPopularShows] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trend, nowPlay, popShows, topRated] = await Promise.all([
          getTrending(),
          getMovies('now_playing'),
          getTVShows('popular'),
          getMovies('top_rated'),
        ]);
        setTrending(trend.slice(0, 10)); // Top 10 for Hero
        setNowPlayingMovies(nowPlay);
        setPopularShows(popShows);
        setTopRatedMovies(topRated);
      } catch (e) {
        console.error("Failed to load browse data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-0">
      <HeroCarousel items={trending} onItemClick={onItemClick} />
      
      <div className="-mt-16 relative z-30 space-y-8 pb-10">
        <ContentRow title="New Movies" items={nowPlayingMovies} onItemClick={onItemClick} isPoster={true} />
        <ContentRow title="Popular TV Shows" items={popularShows} onItemClick={onItemClick} isPoster={false} />
        <ContentRow title="Critically Acclaimed Movies" items={topRatedMovies} onItemClick={onItemClick} isPoster={true} />
      </div>
    </div>
  );
};

export default Browse;
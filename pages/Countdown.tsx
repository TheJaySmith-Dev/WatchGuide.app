import React, { useEffect, useState } from 'react';
import { getMovies, getTVShows, getImageUrl } from '../services/api';
import { MediaItem } from '../types';
import { Timer, Tv, Film, ChevronRight, Clock } from 'lucide-react';

interface CountdownProps {
    onItemClick: (item: MediaItem) => void;
    region?: string;
}

const CountdownUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-w-[60px]">
        <span className="text-2xl font-black text-white">{value}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
);

const CountdownDisplay: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft(null);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return <div className="text-green-500 font-bold uppercase tracking-widest flex items-center gap-2"><Clock size={16} /> Released Now</div>;

    return (
        <div className="flex gap-2">
            <CountdownUnit value={timeLeft.days} label="Days" />
            <CountdownUnit value={timeLeft.hours} label="Hrs" />
            <CountdownUnit value={timeLeft.minutes} label="Mins" />
            <CountdownUnit value={timeLeft.seconds} label="Secs" />
        </div>
    );
};

const Countdown: React.FC<CountdownProps> = ({ onItemClick, region = 'US' }) => {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCountdownData = async () => {
            try {
                const [movies, tv] = await Promise.all([
                    getMovies('upcoming', region),
                    getTVShows('on_the_air')
                ]);

                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const combined = [...movies, ...tv]
                    .map(item => ({
                        ...item,
                        release_date: item.release_date || item.first_air_date
                    }))
                    .filter(item => {
                        const dateStr = item.release_date;
                        if (!dateStr) return false;
                        const date = new Date(dateStr);
                        // Adjust for timezone to avoid premature filtering
                        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
                        return adjustedDate >= now;
                    })
                    .sort((a, b) => new Date(a.release_date!).getTime() - new Date(b.release_date!).getTime());

                setItems(combined);
            } catch (error) {
                console.error("Failed to fetch countdown data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCountdownData();
    }, [region]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-12 px-6 pb-24 md:pl-32">
            <header className="mb-12 relative z-10">
                <h1 className="text-4xl font-black text-white flex items-center gap-4">
                    <Timer size={36} className="text-indigo-500" />
                    Release Countdown
                </h1>
                <p className="text-gray-400 mt-2">Track the time until your most anticipated releases</p>
            </header>

            <div className="grid grid-cols-1 gap-6 max-w-5xl relative z-0">
                {items.map((item) => (
                    <div 
                        key={`${item.id}-${item.media_type}`}
                        onClick={() => onItemClick(item)}
                        className="group relative overflow-hidden rounded-3xl bg-[#121212] border border-white/5 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer"
                    >
                        <div className="absolute inset-0">
                            <img 
                                src={getImageUrl(item.backdrop_path || item.poster_path, 'original')} 
                                alt={item.title}
                                className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/90 to-transparent" />
                        </div>

                        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                            {/* Poster */}
                            <div className="w-24 md:w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                <img 
                                    src={getImageUrl(item.poster_path)} 
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                    {item.media_type === 'tv' ? <Tv size={12} /> : <Film size={12} />}
                                    <span>{formatDate(item.release_date)}</span>
                                </div>
                                
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
                                    {item.title || item.name}
                                </h3>

                                <CountdownDisplay targetDate={item.release_date!} />
                            </div>

                            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-indigo-500 text-white/50 group-hover:text-white transition-all">
                                <ChevronRight size={24} />
                            </div>
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p>No upcoming releases found at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Countdown;

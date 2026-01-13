import React, { useEffect, useState } from 'react';
import { getMovies, getTVShows, getImageUrl } from '../services/api';
import { MediaItem } from '../types';
import { Calendar as CalendarIcon, ChevronRight, Clock, Tv, Film } from 'lucide-react';

interface CalendarProps {
    onItemClick: (item: MediaItem) => void;
}

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
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

    if (!timeLeft) return <span className="text-green-400 font-bold uppercase tracking-tighter animate-pulse">Released now</span>;

    return (
        <div className="flex gap-2 items-center text-xs font-black uppercase tracking-widest">
            <div className="flex flex-col items-center px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-indigo-400 text-sm leading-none">{timeLeft.days}</span>
                <span className="text-[8px] text-gray-500">Days</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-white text-sm leading-none">{timeLeft.hours}</span>
                <span className="text-[8px] text-gray-500">Hrs</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-white text-sm leading-none">{timeLeft.minutes}</span>
                <span className="text-[8px] text-gray-500">Min</span>
            </div>
        </div>
    );
};

const Calendar: React.FC<CalendarProps> = ({ onItemClick }) => {
    const [upcoming, setUpcoming] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalendarData = async () => {
            try {
                const [movies, tv] = await Promise.all([
                    getMovies('upcoming'),
                    getTVShows('on_the_air')
                ]);

                const now = new Date();
                const combined = [...movies, ...tv]
                    .map(item => ({
                        ...item,
                        release_date: item.release_date || item.first_air_date
                    }))
                    .filter(item => item.release_date && new Date(item.release_date) >= now)
                    .sort((a, b) => new Date(a.release_date!).getTime() - new Date(b.release_date!).getTime());

                setUpcoming(combined.slice(0, 15));
            } catch (error) {
                console.error("Failed to fetch calendar data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendarData();
    }, []);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
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
            <header className="mb-12">
                <h1 className="text-4xl font-black text-white flex items-center gap-4">
                    <CalendarIcon size={36} className="text-indigo-500" />
                    Release Calendar
                </h1>
                <p className="text-gray-400 mt-2">Upcoming theatrical and streaming premieres</p>
            </header>

            <div className="max-w-4xl space-y-8 relative before:absolute before:left-4 md:before:left-6 before:top-2 before:bottom-0 before:w-px before:bg-white/10">
                {upcoming.map((item) => (
                    <div
                        key={`${item.id}-${item.media_type}`}
                        onClick={() => onItemClick(item)}
                        className="relative pl-12 md:pl-16 group cursor-pointer animate-slide-up"
                    >
                        {/* Timeline Node */}
                        <div className="absolute left-3 md:left-5 top-8 w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(129,140,248,0.8)] group-hover:scale-150 transition-all duration-500 z-10" />

                        <div className="flex flex-col md:flex-row gap-6 p-6 glass-card rounded-[2rem] group-hover:bg-white/10 transition-all duration-500 group-hover:translate-x-2">
                            {/* Poster */}
                            <div className="w-24 md:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 relative">
                                <img src={getImageUrl(item.poster_path)} alt={item.title || item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                                    {item.media_type === 'tv' ? <Tv size={12} className="text-indigo-400" /> : <Film size={12} className="text-indigo-400" />}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">{formatDate(item.release_date)}</span>
                                        <h3 className="text-2xl font-black text-white leading-tight group-hover:text-indigo-300 transition-colors">
                                            {item.title || item.name}
                                        </h3>
                                    </div>
                                    <CountdownTimer targetDate={item.release_date!} />
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2 md:line-clamp-2 mb-4 font-normal leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                    {item.overview}
                                </p>
                                <div className="flex items-center text-white/40 group-hover:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] gap-2 transition-colors">
                                    <span>Explore Preview</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Calendar;

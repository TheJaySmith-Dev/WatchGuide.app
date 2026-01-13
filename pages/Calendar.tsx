import React, { useEffect, useState } from 'react';
import { getMovies } from '../services/api';
import { MediaItem } from '../types';
import { getImageUrl } from '../services/api';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

interface CalendarProps {
    onItemClick: (item: MediaItem) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onItemClick }) => {
    const [upcoming, setUpcoming] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMovies('upcoming').then(data => {
            // Sort by release date
            const sorted = data.sort((a, b) => {
                return new Date(a.release_date || '').getTime() - new Date(b.release_date || '').getTime();
            });
            setUpcoming(sorted);
            setLoading(false);
        });
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
                {upcoming.map((item, idx) => (
                    <div
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="relative pl-12 md:pl-16 group cursor-pointer"
                    >
                        {/* Dot */}
                        <div className="absolute left-3 md:left-5 top-2 w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.8)] group-hover:scale-125 transition-transform z-10" />

                        <div className="flex flex-col md:flex-row gap-6 p-6 bg-white/5 border border-white/10 rounded-3xl group-hover:bg-white/10 transition-all group-hover:border-white/20">
                            <div className="w-24 md:w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/5 shrink-0">
                                <img src={getImageUrl(item.poster_path)} alt={item.title} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-indigo-400 font-bold text-sm mb-1">{formatDate(item.release_date)}</span>
                                <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-indigo-300 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-2 md:line-clamp-3 mb-4 font-light leading-relaxed">
                                    {item.overview}
                                </p>
                                <div className="flex items-center text-indigo-400 text-xs font-bold uppercase tracking-widest gap-1">
                                    <span>View Details</span>
                                    <ChevronRight size={14} />
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

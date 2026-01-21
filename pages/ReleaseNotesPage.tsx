import React from 'react';
import { ArrowLeft, Rocket, Zap, Layout, Sparkles, BrainCircuit } from 'lucide-react';

interface Release {
    version: string;
    date: string;
    title: string;
    features: {
        title: string;
        description: string;
        icon: React.ElementType;
        color: string;
    }[];
}

const releases: Release[] = [
    {
        version: "1.2.0",
        date: "January 20, 2026",
        title: "The Discovery & Profile Update",
        features: [
            {
                title: "User Profile & Stats",
                description: "Track your journey with a new dashboard showing your total watch time and top genres. Manage your settings and API connections in one place.",
                icon: Layout, // Reusing Layout or finding a better one like User
                color: "text-emerald-400 bg-emerald-500/10"
            },
            {
                title: "Advanced Search",
                description: "Find exactly what you're looking for with new Genre and Year filters. Explore curated Featured Collections like Marvel and Star Wars.",
                icon: Sparkles,
                color: "text-cyan-400 bg-cyan-500/10"
            },
            {
                title: "TV Seasons & Episodes",
                description: "Dive deeper into TV shows with a complete season and episode guide directly in the detail view.",
                icon: Layout, // Using Layout as placeholder, maybe change to something else if available
                color: "text-orange-400 bg-orange-500/10"
            },
            {
                title: "Trending Ranks",
                description: "See what's hot with the new Top 10 Trending row, featuring stylized ranking numbers to highlight the most popular content.",
                icon: Rocket,
                color: "text-rose-400 bg-rose-500/10"
            }
        ]
    },
    {
        version: "1.1.0",
        date: "January 2026",
        title: "The Experience Update",
        features: [
            {
                title: "Redesigned Lists & Hubs",
                description: "Manage your lists with a stunning new grid view. Create custom hubs for your favorite franchises and genres that look beautiful on your home screen.",
                icon: Layout,
                color: "text-purple-400 bg-purple-500/10"
            },
            {
                title: "GuideAI Full Experience",
                description: "GuideAI now has its own dedicated full-screen home. Have deeper, distraction-free conversations with your personal movie assistant.",
                icon: BrainCircuit,
                color: "text-pink-400 bg-pink-500/10"
            },
            {
                title: "Desktop Dock",
                description: "A reimagined navigation experience for desktop users. The new floating dock brings a modern, OS-like feel to your browsing.",
                icon: Sparkles,
                color: "text-amber-400 bg-amber-500/10"
            }
        ]
    },
    {
        version: "1.0.0",
        date: "December 2025",
        title: "Initial Release",
        features: [
            {
                title: "Universal Discovery",
                description: "Browse trending movies and TV shows from all major streaming services in one place.",
                icon: Rocket,
                color: "text-blue-400 bg-blue-500/10"
            },
            {
                title: "Smart Sync",
                description: "Seamless integration with Simkl and Trakt to keep your watchlist and history in sync across all your devices.",
                icon: Zap,
                color: "text-green-400 bg-green-500/10"
            }
        ]
    }
];

interface ReleaseNotesPageProps {
    onBack: () => void;
}

const ReleaseNotesPage: React.FC<ReleaseNotesPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen pt-24 px-4 pb-24 md:pl-32 bg-[#050505] animate-fade-in">
            <div className="max-w-4xl mx-auto relative">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Release Notes</h1>
                        <p className="text-gray-400">See what's new in WatchGuide</p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-12 relative before:absolute before:left-8 md:before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-white/10 before:-translate-x-1/2">
                    {releases.map((release, idx) => (
                        <div key={idx} className="relative flex flex-col md:flex-row gap-8 md:gap-0 group">
                            
                            {/* Timeline Dot */}
                            <div className="absolute left-8 md:left-1/2 top-0 w-4 h-4 rounded-full bg-[#050505] border-2 border-indigo-500 -translate-x-1/2 z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                            {/* Date Side (Left on Desktop) */}
                            <div className={`md:w-1/2 pl-20 md:pl-0 md:pr-12 md:text-right ${idx % 2 === 0 ? 'md:order-1' : 'md:order-2 md:!text-left md:!pl-12 md:!pr-0'}`}>
                                <div className="inline-block px-3 py-1 bg-white/5 rounded-full border border-white/10 text-indigo-400 font-mono text-sm mb-2">
                                    v{release.version}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">{release.title}</h3>
                                <p className="text-gray-500 text-sm mb-4">{release.date}</p>
                            </div>

                            {/* Content Side (Right on Desktop) */}
                            <div className={`md:w-1/2 pl-20 md:pl-12 ${idx % 2 === 0 ? 'md:order-2' : 'md:order-1 md:!pr-12 md:!pl-0 md:!text-right'}`}>
                                <div className="space-y-4">
                                    {release.features.map((feature, fIdx) => {
                                        const Icon = feature.icon;
                                        return (
                                            <div 
                                                key={fIdx} 
                                                className={`bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors flex gap-4 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.color}`}>
                                                    <Icon size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold mb-1">{feature.title}</h4>
                                                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    ))}
                </div>

                <div className="text-center mt-24 text-gray-600 text-sm pb-12">
                    <p>Built with ❤️ by GuideAI</p>
                </div>

            </div>
        </div>
    );
};

export default ReleaseNotesPage;

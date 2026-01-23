import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Sparkles, List, BrainCircuit, Cloud, ArrowRight } from 'lucide-react';

interface OnboardingStep {
    title: string;
    description: string;
    icon: React.ElementType;
    image?: string;
    color: string;
}

const steps: OnboardingStep[] = [
    {
        title: "Welcome to WatchGuide",
        description: "Your ultimate companion for tracking movies and TV shows. Discover, track, and organize your entertainment life in one beautiful place.",
        icon: Sparkles,
        color: "from-amber-400 to-orange-500"
    },
    {
        title: "Create Custom Hubs",
        description: "Go to 'More > Lists' to create your own personalized content hubs. Import lists from Trakt or create your own collections like 'Marvel Universe' or 'Cozy Weekend'.",
        icon: List,
        color: "from-purple-500 to-indigo-500"
    },
    {
        title: "Meet Chron",
        description: "Your personal movie expert. Ask for recommendations based on your mood, find similar movies, or get detailed info about any title. Chron is built into WatchGuide.",
        icon: BrainCircuit,
        color: "from-pink-500 to-rose-500"
    },
    {
        title: "Sync Everything",
        description: "Connect your Simkl or Trakt account to sync your watchlist, history, and ratings across all your devices automatically.",
        icon: Cloud,
        color: "from-blue-400 to-cyan-500"
    }
];

interface OnboardingTourProps {
    onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay for entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onComplete, 500); // Wait for exit animation
    };

    const step = steps[currentStep];
    const Icon = step.icon;

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-6 transition-all duration-500 ${isVisible ? 'bg-black/80 backdrop-blur-md opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`}>
            <div className={`w-full max-w-lg bg-[#101010] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-700 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
                
                {/* Background Glow */}
                <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-br ${step.color} opacity-20 blur-3xl transition-colors duration-700`} />
                
                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="relative z-10 p-8 flex flex-col items-center text-center h-full min-h-[500px]">
                    
                    {/* Icon / Image Area */}
                    <div className="flex-1 flex items-center justify-center w-full py-8">
                        <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-float`}>
                            <Icon size={64} className="text-white drop-shadow-lg" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-8 space-y-4">
                        <h2 className="text-3xl font-bold text-white tracking-tight">{step.title}</h2>
                        <p className="text-gray-400 text-lg leading-relaxed max-w-sm mx-auto">
                            {step.description}
                        </p>
                    </div>

                    {/* Progress Indicators */}
                    <div className="flex gap-2 mb-8">
                        {steps.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? `w-8 bg-gradient-to-r ${step.color}` : 'w-2 bg-white/10'}`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleNext}
                        className={`w-full py-4 rounded-xl bg-gradient-to-r ${step.color} text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group`}
                    >
                        <span>{currentStep === steps.length - 1 ? "Get Started" : "Continue"}</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;

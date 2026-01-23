import React, { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';

interface ChronIntroProps {
  forceShow?: boolean;
  onDismiss?: () => void;
}

const ChronIntro: React.FC<ChronIntroProps> = ({ forceShow, onDismiss }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    return !localStorage.getItem('has_seen_chron_intro');
  });

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('has_seen_chron_intro');
      setVisible(true);
    };
    window.addEventListener('restartChronIntro', handler as EventListener);
    return () => window.removeEventListener('restartChronIntro', handler as EventListener);
  }, []);

  if (!visible) return null;

  return (
    <div className="max-w-3xl mx-auto mb-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
          <BrainCircuit size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">Introducing Chron</h3>
          <p className="text-gray-400">
            Chron is your personal movie and TV guide. Ask for tailored recommendations, explore similar titles,
            and get fast answers about casts, trailers, and where to watch. Chron learns from your liked items to
            personalize suggestions while keeping everything private on your device.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                localStorage.setItem('has_seen_chron_intro', 'true');
                setVisible(false);
                onDismiss && onDismiss();
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
            >
              Got it
            </button>
            <a
              href="#/chron"
              className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-colors"
            >
              Open Chron
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChronIntro;

import React from 'react';
import { Home, Search, Menu, BrainCircuit } from 'lucide-react';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hide?: boolean;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, hide = false }) => {
  const tabs = [
    { id: 'browse', label: 'Browse', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chron', label: 'Chron', icon: BrainCircuit },
    { id: 'more', label: 'More', icon: Menu },
  ];

  return (
    <>
      <div className={`md:hidden fixed top-4 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-1 px-1 transition-all duration-300 ${hide ? 'opacity-0 -translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-full border text-xs transition-all duration-200 backdrop-blur-md ${
                isActive
                  ? 'bg-white text-black border-white/60 shadow-[0_6px_16px_rgba(255,255,255,0.2)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)]'
                  : 'bg-white/10 text-white/80 border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={`hidden md:flex fixed top-8 left-1/2 -translate-x-1/2 z-[210] gap-3 transition-all duration-300 ${
        hide ? 'opacity-0 -translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-5 py-2.5 rounded-full border text-sm transition-all duration-200 backdrop-blur-md ${
                isActive
                  ? 'bg-white text-black border-white/60 shadow-[0_10px_28px_rgba(255,255,255,0.25)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)]'
                  : 'bg-white/10 text-white/80 border-white/15 shadow-[0_8px_22px_rgba(0,0,0,0.35)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default TabBar;

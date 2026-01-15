import React from 'react';
import { Home, Search, Menu, Bookmark, Calendar } from 'lucide-react';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'browse', label: 'Browse', icon: Home },
    { id: 'mylist', label: 'My List', icon: Bookmark },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'more', label: 'More', icon: Menu },
  ];

  return (
    <>
      {/* Mobile Floating Liquid Glass Bar */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-sm h-16 z-50 rounded-full flex items-center justify-between px-8 
        bg-white/[0.08] backdrop-blur-sm 
        border border-white/20 
        shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] 
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-10 h-10 transition-all duration-300 group`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full" />
              )}
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative z-10 transition-all duration-300 ${isActive
                  ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                  : 'text-white/60 group-hover:text-white/90'
                  }`}
              />
            </button>
          );
        })}
      </div>

      {/* Desktop Side Bar - Floating Vertical Liquid Capsule */}
      <div className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 flex-col items-center py-10 z-50 rounded-[3rem]
        bg-white/[0.06] backdrop-blur-sm 
        border border-white/20 
        shadow-[0_15px_40px_0_rgba(0,0,0,0.4)] 
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),inset_0_-1px_0_0_rgba(255,255,255,0.1)]
        w-24 gap-12"
      >
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform cursor-pointer opacity-90 hover:opacity-100 ring-1 ring-white/10 shrink-0">
          <img
            src="https://i.postimg.cc/dtpYyq9Z/Icon-i-OS-Dark-1024x1024-1x-2-2.png"
            alt="Watch Guide"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col items-center gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500`}
              >
                {/* Active State Glow background */}
                {isActive && (
                  <div className="absolute inset-0 bg-white/[0.1] rounded-2xl shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] border border-white/10" />
                )}

                {/* Icon */}
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`relative z-10 transition-all duration-300 ${isActive
                    ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                    : 'text-white/50 group-hover:text-white group-hover:scale-110'
                    }`}
                />

                {/* Tooltip */}
                <div className="absolute left-16 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl transform translate-x-4 group-hover:translate-x-0 duration-300">
                  {tab.label}
                </div>

                {/* Active Indicator Line (Vertical) */}
                {isActive && <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-400 rounded-r-full shadow-[0_0_15px_rgba(129,140,248,0.6)]" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default TabBar;
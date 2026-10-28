import React from 'react';
import { Home, TrendingUp, Play, ClipboardList, Wallet } from 'lucide-react';

export type NavigationTab = 'home' | 'market' | 'trade' | 'order' | 'assets';

interface BottomNavProps {
  currentTab: NavigationTab;
  onChangeTab: (tab: NavigationTab) => void;
  runningOrderCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  runningOrderCount = 0
}) => {
  const tabs: Array<{ id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'market', label: 'Market', icon: TrendingUp },
    { id: 'trade', label: 'Trade', icon: Play },
    { id: 'order', label: 'Order', icon: ClipboardList },
    { id: 'assets', label: 'Assets', icon: Wallet }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#d0d4db] border-t border-slate-300/90 py-1.5 px-3 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 transition-all group active:scale-95"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-[#2563eb] scale-110 stroke-[2.5]'
                      : 'text-slate-700 group-hover:text-slate-900 stroke-[1.8]'
                  }`}
                />
                {tab.id === 'order' && runningOrderCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[9px] font-black text-white bg-blue-600 rounded-full animate-pulse shadow">
                    {runningOrderCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold mt-1 tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-[#2563eb] font-black' : 'text-slate-700 group-hover:text-slate-900'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-[2.5px] bg-[#2563eb] rounded-full mt-0.5 animate-fadeIn" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

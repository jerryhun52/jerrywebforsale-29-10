import React from 'react';
import { Bell } from 'lucide-react';
import { Currency, CURRENCIES, User } from '../types.ts';

interface HeaderProps {
  user: User | null;
  currency: Currency;
  onOpenCurrency: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onOpenAssets?: () => void;
  onToggleAdmin?: () => void;
  isAdminView?: boolean;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currency,
  onOpenCurrency,
  onOpenNotifications,
  onOpenAuth,
  onOpenAssets,
  unreadCount = 1
}) => {
  const activeCurrencyCode = (user?.nativeCurrency === 'USD') ? 'USD' : 'INR';
  const currentMeta = CURRENCIES[activeCurrencyCode] || CURRENCIES.INR;

  const handleCurrencyClick = () => {
    if (user) {
      alert(`Currency is fixed at account registration (${user.nativeCurrency}) and cannot be changed from settings.`);
    } else {
      onOpenCurrency();
    }
  };

  const handleProfileClick = () => {
    if (user && onOpenAssets) {
      onOpenAssets();
    } else {
      onOpenAuth();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#b0bdcc] border-b border-slate-400/60 px-3 py-2.5 shadow-sm">
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between px-1 sm:px-2">
        {/* Brand Logo - Single Horizontal Row */}
        <div className="flex items-center space-x-2 cursor-pointer">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#0c4a6e] shadow-md p-1 border border-cyan-400/40 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-200 stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M7 12h10" />
              <path d="M12 7v10" />
              <circle cx="12" cy="12" r="4" className="stroke-white" />
            </svg>
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-sm sm:text-base font-black tracking-wider text-slate-900 leading-none">
              COIN BASED
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-800 uppercase leading-none mt-0.5">
              Trade &amp; Invest
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* White Currency Pill Button with Country Flag Logo */}
          <button
            onClick={handleCurrencyClick}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-white text-slate-900 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black shadow-sm hover:bg-slate-50 transition-all active:scale-95 border border-slate-300/80"
            title={user ? `Fixed Currency: ${currentMeta.code}` : "Change Currency"}
          >
            <span className="text-sm leading-none">{currentMeta.flag || '🇺🇸'}</span>
            <span className="text-[11px] sm:text-xs font-black text-slate-900">{currentMeta.code}</span>
          </button>

          {/* White Notification Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 rounded-full bg-white text-slate-800 hover:bg-slate-50 transition-all border border-slate-300/80 shadow-sm active:scale-95"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white"></span>
            )}
          </button>

          {/* Login Blue Button / Compact User Avatar Button */}
          {user ? (
            <button
              onClick={handleProfileClick}
              className="flex items-center space-x-1 sm:space-x-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-md transition-all active:scale-95"
              title={`Logged in as ${user.username}`}
            >
              <div className="w-5 h-5 rounded-full bg-white text-blue-700 flex items-center justify-center font-black text-[10px] shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-bold truncate max-w-[90px]">{user.username}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-extrabold shadow-md transition-all active:scale-95"
              title="Sign In / Register"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Bell } from 'lucide-react';
import { Currency, CURRENCIES, User } from '../types.ts';

interface HeaderProps {
  user: User | null;
  currency: Currency;
  onOpenCurrency: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
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
  unreadCount = 1
}) => {
  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5">
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between px-1 sm:px-2">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2.5 cursor-pointer">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#0c4a6e] shadow-md shadow-cyan-900/40 p-1 border border-cyan-400/30">
            {/* Flow Coin Icon: Stylized loop / strike */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan-300 stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M7 12h10" />
              <path d="M12 7v10" />
              <circle cx="12" cy="12" r="4" className="stroke-white" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wider text-white leading-none">
              FLOW COIN
            </span>
            <span className="text-[9px] font-bold tracking-widest text-cyan-400 leading-tight uppercase mt-0.5">
              Trade - Invest
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2">

          {/* Currency Pill */}
          <button
            onClick={onOpenCurrency}
            className="flex items-center space-x-1 bg-white text-slate-900 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
          >
            <span className="text-[11px] font-black">{currentMeta.code.slice(0, 2)}</span>
            <span className="text-[11px] font-semibold text-slate-700">{currentMeta.code}</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full bg-white text-slate-700 hover:bg-slate-100 transition-all border border-slate-200 shadow-sm active:scale-95"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border border-white"></span>
            )}
          </button>

          {/* User Avatar Pill */}
          <button
            onClick={onOpenAuth}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100/90 text-emerald-800 font-extrabold text-xs border border-white shadow-sm hover:scale-105 transition-all"
            title={user ? `Logged in as ${user.username}` : "Log In / Sign Up"}
          >
            {user ? (user.username.charAt(0).toUpperCase() || 'U') : 'U'}
          </button>
        </div>
      </div>
    </header>
  );
};

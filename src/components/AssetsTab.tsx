import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  KeyRound,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  Send,
  BellRing
} from 'lucide-react';
import { User, Currency, CURRENCIES, SupportNotice, AppConfig } from '../types.ts';

interface AssetsTabProps {
  user: User | null;
  currency: Currency;
  supportNotice: SupportNotice;
  appConfig: AppConfig;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  user,
  currency,
  supportNotice,
  appConfig,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenChangePassword,
  onLogout,
  onOpenAuth
}) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;

  const formatPrice = (pUsd: number) => {
    const val = pUsd * rate;
    if (val >= 1000) {
      return `${currentMeta.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currentMeta.symbol}${val.toFixed(2)}`;
  };

  if (!user) {
    return (
      <div className="space-y-4 pb-20 animate-fadeIn text-center p-8">
        <div className="rounded-3xl bg-[#111827] p-8 border border-slate-800 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Client Portal</h2>
          <p className="text-xs text-slate-400">
            Log in to manage your digital assets, deposit and withdrawal records, and security settings.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-extrabold text-sm text-white transition-all shadow-lg shadow-blue-600/30"
          >
            Log In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  // Pre-filled Telegram Message Link
  const telegramMessage = encodeURIComponent(
    `Hello Flow Coin Support Team,\n\nI need assistance with my account.\nUsername: ${user.username}\nUser ID: ${user.id}\nRegistered Code: ${user.referralCodeUsed || 'N/A'}\nAvailable Balance: $${user.balance.toFixed(2)} USD`
  );
  const telegramUrl = `${appConfig.telegramLink || 'https://t.me/flowcoin_support_desk'}?text=${telegramMessage}`;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Blue Gradient Profile Card (Screenshots 10 & 11) */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] p-5 shadow-2xl text-white relative overflow-hidden">
        {/* Glow backdrop overlay */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* User identity row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0b0f19] border border-amber-400/40 flex items-center justify-center text-white font-black text-xl shadow-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight">{user.username}</span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  <ShieldCheck className="w-3 h-3 text-cyan-300" />
                  <span>Verified Trader</span>
                </span>
              </div>
              <div className="text-xs text-blue-100/80 mt-0.5">
                • {user.email}
              </div>
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="space-y-1 mb-4">
          <div className="text-xs font-semibold text-blue-100/90">
            Available Balance
          </div>
          <div className="text-3xl font-black font-mono-numbers tracking-tight">
            {formatPrice(user.balance)}
          </div>
        </div>

        {/* Escrow Freeze Amount Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-100">
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Freeze Amount (In-Trade):</span>
          </div>
          <div className="text-sm font-black font-mono-numbers text-white">
            {formatPrice(user.freezeBalance)}
          </div>
        </div>

        {/* Credit Score & Account Status */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/15">
          <div className="font-semibold text-blue-100">
            Credit Score: <span className="font-black text-white">{user.creditScore}</span>
          </div>
          <div className="font-semibold text-blue-100">
            Account Status: <span className="font-black text-emerald-300">{user.status}</span>
          </div>
        </div>
      </div>

      {/* Ticker Strip */}
      <div className="rounded-2xl bg-[#111827] py-2.5 px-4 border border-slate-800 text-xs font-mono-numbers flex items-center justify-between overflow-x-auto whitespace-nowrap space-x-4">
        <span className="text-white font-bold">$107,250 <span className="text-emerald-400">+2.4%</span></span>
        <span className="text-slate-500">|</span>
        <span className="text-white font-bold">ETH $6,850 <span className="text-emerald-400">+1.8%</span></span>
        <span className="text-slate-500">|</span>
        <span className="text-white font-bold">BNB $1,245 <span className="text-emerald-400">+3.1%</span></span>
      </div>

      {/* Action Buttons: Deposit & Withdraw */}
      <div className="grid grid-cols-2 gap-3">
        {/* Deposit */}
        <div
          onClick={onOpenDeposit}
          className="flex items-center justify-between p-4 rounded-3xl bg-[#111827] hover:bg-[#1a2234] border border-slate-800 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">Deposit</div>
              <div className="text-[10px] text-slate-400">TRC20, Bank, UPI</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </div>

        {/* Withdraw (Screenshot 10) */}
        <div
          onClick={onOpenWithdraw}
          className="flex items-center justify-between p-4 rounded-3xl bg-[#111827] hover:bg-[#1a2234] border border-slate-800 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">Withdraw</div>
              <div className="text-[10px] text-slate-400">Bank or wallet</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Support Team Notice (OFFICIAL Card - Screenshot 11) */}
      <div className="rounded-3xl bg-blue-600 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-extrabold text-sm">
            <BellRing className="w-4 h-4 text-amber-300" />
            <span>Support Team Notice</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-900/60 text-white border border-blue-400/30 tracking-wider">
            OFFICIAL
          </span>
        </div>

        {/* White Inner Card */}
        <div className="bg-white rounded-2xl p-4 text-slate-900 space-y-2 shadow-inner">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900">
              {supportNotice.title}
            </h4>
            <span className="text-[10px] font-bold text-slate-400">
              {supportNotice.date}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {supportNotice.content}
          </p>
        </div>
      </div>

      {/* 24/7 Telegram Customer Support Desk Button */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-[#229ED9] to-[#1785ba] text-white hover:opacity-95 transition-all shadow-lg active:scale-95"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold">Contact Customer Support Desk</div>
            <div className="text-[11px] text-blue-100 opacity-90">24/7 Live Assistance via Telegram</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white" />
      </a>

      {/* Change Password Button */}
      <button
        onClick={onOpenChangePassword}
        className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-2xl bg-[#111827] hover:bg-[#1a2234] border border-slate-800 text-xs font-extrabold text-white transition-all active:scale-[0.99]"
      >
        <KeyRound className="w-4 h-4 text-cyan-400" />
        <span>Change Account Password</span>
      </button>

      {/* Terms & Privacy */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowTerms(true)}
          className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[#111827] hover:bg-[#1a2234] border border-slate-800 text-xs font-bold text-slate-300 transition-all"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Terms & Conditions</span>
        </button>

        <button
          onClick={() => setShowPrivacy(true)}
          className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[#111827] hover:bg-[#1a2234] border border-slate-800 text-xs font-bold text-slate-300 transition-all"
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Privacy Policy</span>
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-extrabold transition-all active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout Account</span>
      </button>

      {/* Account Registration Invitation Footer */}
      <div className="rounded-2xl bg-[#111827]/80 p-3.5 border border-slate-800 text-center space-y-1">
        <div className="text-[11px] text-slate-400">Account Registration Invitation:</div>
        <div className="text-xs text-slate-300">
          You registered using code:{' '}
          <span className="font-extrabold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30 font-mono-numbers">
            {user.referralCodeUsed || 'DIRECT_REGISTRATION'}
          </span>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-3">
            <h3 className="text-base font-black text-white">Terms & Conditions</h3>
            <div className="max-h-60 overflow-y-auto text-xs text-slate-300 leading-relaxed space-y-2 pr-1">
              <p>1. FLOW COIN provides high-frequency options contract trading. Past performance is not indicative of future returns.</p>
              <p>2. Users must maintain adequate risk management. Escrow margin is deducted on contract entry and settled upon expiration.</p>
              <p>3. Withdrawals are subject to security verification and minimum thresholds.</p>
            </div>
            <button
              onClick={() => setShowTerms(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-5 shadow-2xl space-y-3">
            <h3 className="text-base font-black text-white">Privacy Policy</h3>
            <div className="max-h-60 overflow-y-auto text-xs text-slate-300 leading-relaxed space-y-2 pr-1">
              <p>1. We utilize 256-bit SSL encryption to safeguard all user transactions and account credentials.</p>
              <p>2. Wallet addresses and banking details are encrypted and utilized strictly for payout processing.</p>
            </div>
            <button
              onClick={() => setShowPrivacy(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

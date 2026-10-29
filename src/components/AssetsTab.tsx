import React, { useState, useEffect } from 'react';
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
  BellRing,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { User, Currency, CURRENCIES, SupportNotice, AppConfig, WalletRequest, TradeOrder } from '../types.ts';
import { api } from '../services/api.ts';

interface AssetsTabProps {
  user: User | null;
  currency: Currency;
  supportNotice: SupportNotice;
  appConfig: AppConfig;
  userTrades?: TradeOrder[];
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenPrivacy?: () => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  user,
  currency,
  supportNotice,
  appConfig,
  userTrades = [],
  onOpenDeposit,
  onOpenWithdraw,
  onOpenChangePassword,
  onLogout,
  onOpenAuth,
  onOpenPrivacy
}) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [userRequests, setUserRequests] = useState<WalletRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick for active trade countdowns in Assets tab
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const runningTrades = userTrades.filter(t => t.status === 'RUNNING');

  const activeCurrencyCode = user?.nativeCurrency || currency || 'USD';
  const currentMeta = CURRENCIES[activeCurrencyCode] || CURRENCIES.USD;
  const rate = currentMeta.rate;

  const formatPrice = (amount: number) => {
    if (amount >= 1000) {
      return `${currentMeta.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currentMeta.symbol}${amount.toFixed(2)}`;
  };

  // Fetch user wallet history (deposits & withdrawals with rejection reasons)
  useEffect(() => {
    if (!user) return;
    setIsLoadingRequests(true);
    api.getWalletRequests(user.id)
      .then(reqs => {
        if (reqs) setUserRequests(reqs);
      })
      .catch(console.error)
      .finally(() => setIsLoadingRequests(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div className="space-y-4 pb-20 animate-fadeIn text-center p-8">
        <div className="rounded-3xl bg-[#111827] p-8 border border-slate-800 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Account Profile & Balance</h2>
          <p className="text-xs text-slate-400">
            Please sign in to view your credit score points, assets, and trade history.
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
    `Hello COIN BASED Support Team,\n\nI need assistance with my account.\nUsername: ${user.username}\nUser ID: ${user.id}\nRegistered Code: ${user.referralCodeUsed || 'N/A'}\nAvailable Balance: ${currentMeta.symbol}${user.balance.toFixed(2)} (${currentMeta.code})`
  );
  const telegramUrl = `${appConfig.telegramLink || 'https://t.me/flowcoin_support_desk'}?text=${telegramMessage}`;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Blue Gradient Profile Card */}
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
              <div className="text-xs text-blue-100/80 mt-0.5 font-mono">
                {user.email}
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-black">
            {currentMeta.flag} {currentMeta.code}
          </div>
        </div>

        {/* Available Balance */}
        <div className="space-y-1 mb-4">
          <div className="text-xs font-semibold text-blue-100/90">
            Available Balance ({currentMeta.code})
          </div>
          <div className="text-3xl font-black font-mono-numbers tracking-tight">
            {formatPrice(user.balance)}
          </div>
        </div>

        {/* Escrow Freeze Amount Card */}
        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-100">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Freeze Amount (In-Trade):</span>
            </div>
            <div className="text-sm font-black font-mono-numbers text-amber-300">
              {formatPrice(user.freezeBalance)}
            </div>
          </div>

          {/* Active Trades Live Reason & Remaining Seconds */}
          {runningTrades.length > 0 ? (
            <div className="pt-2 border-t border-white/15 text-xs space-y-1.5">
              {runningTrades.map(t => {
                const expiresAtMs = t.expiresAt ? new Date(t.expiresAt).getTime() : new Date(t.createdAt || Date.now()).getTime() + (t.durationSeconds || 60) * 1000;
                const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
                return (
                  <div key={t.id} className="bg-black/25 p-2 rounded-xl text-[11px] flex items-center justify-between">
                    <div className="text-blue-100 leading-tight">
                      <span className="font-extrabold text-amber-300">{formatPrice(t.marginUsd)}</span> locked for{' '}
                      <span className="font-bold text-white">{t.symbol}</span> ({t.direction === 'UP' ? 'BUY UP' : 'BUY DOWN'})
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[10px] font-mono font-bold shrink-0 ml-2">
                      ⏱️ {secondsLeft}s left
                    </span>
                  </div>
                );
              })}
              <div className="text-[10px] text-blue-200/90 font-mono pt-0.5">
                Reason: Trade in progress. Amount automatically releases upon expiry.
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-blue-200/70 pt-1 border-t border-white/10 font-mono">
              Reason: No active running trades.
            </div>
          )}
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

        {/* Withdraw */}
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

      {/* WITHDRAWAL & DEPOSIT HISTORY SECTION (SHOWS REJECTION REASONS CLEARLY) */}
      <div className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white">Deposit & Withdrawal History</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {userRequests.length} Records
          </span>
        </div>

        {userRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800/80 text-center text-xs text-slate-400">
            No withdrawal or deposit requests recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {userRequests.map(req => {
              const isWithdraw = req.type === 'WITHDRAWAL';
              const isRejected = req.status === 'REJECTED';
              const isApproved = req.status === 'APPROVED';

              return (
                <div
                  key={req.id}
                  className={`p-3.5 rounded-2xl bg-[#0b0f19] border transition-all space-y-2 ${
                    isRejected
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : isApproved
                      ? 'border-emerald-500/30'
                      : 'border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-xl ${isWithdraw ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {isWithdraw ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">
                          {req.type} ({req.network})
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-black text-white">
                        {formatPrice(req.amountUsd)}
                      </div>
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isApproved && <CheckCircle className="w-2.5 h-2.5" />}
                        {isRejected && <XCircle className="w-2.5 h-2.5" />}
                        <span>{req.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* PROMINENT REJECTION REASON DISPLAY */}
                  {isRejected && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-white block">Withdrawal Rejected Reason:</span>
                        <span className="font-mono text-rose-200">{req.remarks || 'Rejected by finance audit. Please contact support.'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Support Team Notice (OFFICIAL Card) */}
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
          onClick={() => onOpenPrivacy ? onOpenPrivacy() : setShowPrivacy(true)}
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
              <p>1. COIN BASED provides high-frequency options contract trading. Past performance is not indicative of future returns.</p>
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

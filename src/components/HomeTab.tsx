import React from 'react';
import {
  Shield,
  Zap,
  Headphones,
  Globe,
  Smartphone,
  ArrowRight,
  Download,
  FolderDown,
  User,
  ArrowUpRight
} from 'lucide-react';
import { CoinTicker, Currency, CURRENCIES } from '../types.ts';

interface HomeTabProps {
  tickers: CoinTicker[];
  currency: Currency;
  onSelectCoin: (symbol: string) => void;
  onViewAllMarkets: () => void;
  onNavigateToTrade?: () => void;
  onNavigateToWithdraw?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  tickers,
  currency,
  onSelectCoin,
  onViewAllMarkets,
  onNavigateToTrade,
  onNavigateToWithdraw
}) => {
  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;

  const topQuotes = tickers.slice(0, 6);

  const formatPrice = (priceUsd: number) => {
    const converted = priceUsd * rate;
    if (converted >= 1000) {
      return `${currentMeta.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (converted >= 1) {
      return `${currentMeta.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currentMeta.symbol}${converted.toFixed(4)}`;
  };

  const handleDownloadApk = () => {
    const element = document.createElement('a');
    const file = new Blob(['FLOW COIN Official Android App v2.4 (Simulated Package)'], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'flowcoin-v2.4-official.apk';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Hero Container (Responsive: Mobile Stack & PC Desktop Split Layout matching image_e3e35169.png) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#09101d] p-5 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl">
        {/* Glow ambient background effect */}
        <div className="absolute top-0 right-1/4 -mt-20 w-80 h-80 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column (Content & App Box) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-5">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 text-slate-200 text-xs font-semibold shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500"></span>
              <span>Trusted by Traders Worldwide</span>
            </div>

            {/* Hero Headings */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Trade Smarter,
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-cyan-400 tracking-tight leading-tight">
                Invest Better,
              </h2>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent tracking-tight leading-tight">
                Grow Together.
              </h2>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              Professional crypto trading platform with advanced tools, secure wallet, fast withdrawals and real-time market data.
            </p>

            {/* FLOW COIN Mobile App Card (Exact match to image_e3e35169.png) */}
            <div className="rounded-2xl bg-[#0d182b]/90 p-4 sm:p-5 border border-cyan-500/25 shadow-xl space-y-3.5">
              <div className="flex items-start space-x-3.5">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/20">
                  <div className="w-full h-full bg-[#0a192f] rounded-[14px] flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-cyan-300" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      FLOW COIN Mobile App
                    </h3>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40 uppercase">
                      V2.4 Official Android
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/40">
                      ⚡ 100% Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    60s Options, Real-time Binance Charts, 100% Virus-Free & Fast Local Withdrawals
                  </p>
                </div>
              </div>

              {/* Two Download Buttons Row (Screenshot Match) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Button 1: Direct APK Download */}
                <button
                  onClick={handleDownloadApk}
                  className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 text-left transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900/40 flex items-center justify-center text-white flex-shrink-0">
                    <Download className="w-4 h-4 text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-950">Direct APK Download</div>
                    <div className="text-[10px] font-bold text-slate-900/80">High Speed Direct Server File</div>
                  </div>
                </button>

                {/* Button 2: Google Drive / Cloud Download */}
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-xl bg-[#091322] hover:bg-[#111f35] border border-cyan-500/30 text-left transition-all active:scale-95"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0">
                    <FolderDown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Google Drive / Cloud Download</div>
                    <div className="text-[10px] font-bold text-cyan-400">External Mirror Cloud Link</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Bottom Action Buttons (Screenshot Match) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onNavigateToTrade || (() => onSelectCoin('BTC/USDT'))}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00c6ff] to-[#9233ea] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>Trade 60s Options</span>
              </button>

              <button
                onClick={onNavigateToWithdraw}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#0b1426] hover:bg-[#111e38] text-cyan-300 border border-cyan-500/40 font-extrabold text-xs sm:text-sm transition-all active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdrawal Amount</span>
              </button>
            </div>
          </div>

          {/* Right Column: Holographic Glowing Bitcoin Sphere (Screenshot Match) */}
          <div className="lg:col-span-5 xl:col-span-5 flex items-center justify-center py-6 lg:py-0">
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-20" />
              {/* Middle glowing neon radial circle */}
              <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-cyan-400/30 bg-gradient-to-b from-cyan-900/30 via-blue-950/50 to-[#07111e] shadow-[0_0_60px_rgba(6,182,212,0.35)]" />
              {/* Dotted orbital ring */}
              <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-cyan-400/20 border-dashed" />
              {/* Giant Glowing Bitcoin Symbol */}
              <div className="relative text-cyan-300 text-7xl sm:text-8xl font-black drop-shadow-[0_0_25px_rgba(6,182,212,0.95)] select-none">
                ₿
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Badges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-start space-x-2.5 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Bank Level Security</div>
            <div className="text-[10px] text-slate-400 mt-0.5">256-bit SSL Encryption</div>
          </div>
        </div>

        <div className="flex items-start space-x-2.5 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Instant Withdrawals</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fast & Reliable Local Payouts</div>
          </div>
        </div>

        <div className="flex items-start space-x-2.5 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">24/7 Live Support</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Official Telegram Desk</div>
          </div>
        </div>

        <div className="flex items-start space-x-2.5 bg-[#111827] p-3 rounded-2xl border border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Global Platform</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Multi-Currency Engine</div>
          </div>
        </div>
      </div>

      {/* Market Quotes Section */}
      <div className="rounded-3xl bg-[#111827] p-5 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
              Market Quotes
            </h3>
          </div>
          <button
            onClick={onViewAllMarkets}
            className="flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Grid of Quotes: 1 col on mobile, 2 col on tablet, 3 col on PC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topQuotes.map((coin) => (
            <div
              key={coin.symbol}
              onClick={() => onSelectCoin(coin.symbol)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b0f19] hover:bg-[#152033] border border-slate-800/80 transition-all cursor-pointer active:scale-[0.99] group shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-400 w-3 text-center">
                  {coin.rank}
                </span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md"
                  style={{ backgroundColor: coin.iconBg }}
                >
                  {coin.iconSymbol}
                </div>
                <div>
                  <div className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                    {coin.symbol}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {coin.name}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-white font-mono-numbers">
                  {formatPrice(coin.price)}
                </div>
                <div className="text-xs font-bold text-emerald-400 font-mono-numbers">
                  +{coin.change24h}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

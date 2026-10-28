import React, { useState, useMemo } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { CoinTicker, Currency, CURRENCIES } from '../types.ts';

interface MarketTabProps {
  tickers: CoinTicker[];
  currency: Currency;
  onSelectCoin: (symbol: string) => void;
}

export const MarketTab: React.FC<MarketTabProps> = ({
  tickers,
  currency,
  onSelectCoin
}) => {
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [search, setSearch] = useState('');

  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;

  const filteredCoins = useMemo(() => {
    let result = [...tickers];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
    }

    if (filter === 'gainers') {
      result.sort((a, b) => b.change24h - a.change24h);
    } else if (filter === 'losers') {
      result.sort((a, b) => a.change24h - b.change24h);
    }

    return result;
  }, [tickers, filter, search]);

  const formatPrice = (priceUsd: number) => {
    const val = priceUsd * rate;
    if (val >= 1000) {
      return `${currentMeta.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (val >= 1) {
      return `${currentMeta.symbol}${val.toFixed(2)}`;
    }
    return `${currentMeta.symbol}${val.toFixed(4)}`;
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Top Card Container */}
      <div className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight mb-1">
          Crypto Market Rates
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Live spot tickers from BTC/USDT to BTS/USDT • Click any coin to open Candlestick Trade Desk
        </p>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({tickers.length})
          </button>
          <button
            onClick={() => setFilter('gainers')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'gainers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Top Gainers
          </button>
          <button
            onClick={() => setFilter('losers')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'losers'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Losers
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coin name or symbol (e.g. BTC, ETH,"
            className="w-full bg-[#0b0f19] text-xs text-white placeholder-slate-500 rounded-xl pl-10 pr-3 py-2.5 border border-slate-700/60 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>

      {/* Coin Rates List */}
      <div className="rounded-3xl bg-[#111827] p-2 border border-slate-800 shadow-xl divide-y divide-slate-800/60">
        {filteredCoins.map((coin) => (
          <div
            key={coin.symbol}
            onClick={() => onSelectCoin(coin.symbol)}
            className="flex items-center justify-between p-3 hover:bg-[#1a2234] rounded-2xl transition-all cursor-pointer active:scale-[0.99] group"
          >
            {/* Left: Avatar & Symbol */}
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-xs shadow-md"
                style={{ backgroundColor: coin.iconBg }}
              >
                {coin.iconSymbol}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {coin.symbol}
                  </span>
                  {coin.rank <= 3 && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-black rounded border border-amber-500/40">
                      TOP {coin.rank}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {coin.name}
                </div>
              </div>
            </div>

            {/* Right: Price, 24h High, & Change Badge */}
            <div className="text-right">
              <div className="text-sm font-black text-white font-mono-numbers">
                {formatPrice(coin.price)}
              </div>
              <div className="flex items-center justify-end space-x-2 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono-numbers">
                  24h High: {formatPrice(coin.high24h)}
                </span>
                <span
                  className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full text-[10px] font-black font-mono-numbers ${
                    coin.change24h >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>+{coin.change24h}%</span>
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredCoins.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No matching crypto coins found.
          </div>
        )}
      </div>
    </div>
  );
};

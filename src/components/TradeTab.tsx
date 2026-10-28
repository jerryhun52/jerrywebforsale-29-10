import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowUp, ArrowDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { CoinTicker, Currency, CURRENCIES, User, Candlestick, TradeOrder } from '../types.ts';
import { CandlestickChart } from './CandlestickChart.tsx';
import { api } from '../services/api.ts';

interface TradeTabProps {
  user: User | null;
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  tickers: CoinTicker[];
  currency: Currency;
  onRefreshUser: () => void;
  onTradePlaced: (trade: TradeOrder) => void;
}

interface DurationOption {
  seconds: number;
  label: string;
  yieldPercent: number;
  tag: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { seconds: 30, label: '30s', yieldPercent: 20, tag: 'TURBO' },
  { seconds: 60, label: '60s', yieldPercent: 20, tag: 'STANDARD' },
  { seconds: 120, label: '120s', yieldPercent: 40, tag: 'HIGH YIELD' },
  { seconds: 180, label: '180s', yieldPercent: 60, tag: 'EXTENDED' },
  { seconds: 300, label: '300s', yieldPercent: 80, tag: 'MAX YIELD' }
];

export const TradeTab: React.FC<TradeTabProps> = ({
  user,
  selectedSymbol,
  onSelectSymbol,
  tickers,
  currency,
  onRefreshUser,
  onTradePlaced
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('1m');
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [amountInput, setAmountInput] = useState<string>('50');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATION_OPTIONS[1]); // 60s
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRunningTrade, setActiveRunningTrade] = useState<TradeOrder | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [tradeSettlementResult, setTradeSettlementResult] = useState<{ outcome: 'WIN' | 'LOSS'; payout: number } | null>(null);

  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;

  const currentCoin = tickers.find(t => t.symbol === selectedSymbol) || tickers[0] || {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    price: 81400.85,
    change24h: 2.13,
    high24h: 81823.0,
    low24h: 79506.0,
    volume24h: '1.00B USDT',
    iconBg: '#f7931a',
    iconSymbol: '₿'
  };

  // Fetch candles
  useEffect(() => {
    let isMounted = true;
    api.getCandles(selectedSymbol, timeframe).then(data => {
      if (isMounted) setCandles(data);
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, timeframe]);

  // Quick amount chips in USD base
  const quickAmounts = [10, 50, 100, 250, 500, 1000];

  const parsedAmountUsd = parseFloat(amountInput) || 0;
  const availableBalanceUsd = user ? user.balance : 1000.0;
  const expectedProfitUsd = +(parsedAmountUsd * (selectedDuration.yieldPercent / 100)).toFixed(2);
  const totalPayoutUsd = +(parsedAmountUsd + expectedProfitUsd).toFixed(2);

  const formatPrice = (pUsd: number) => {
    const val = pUsd * rate;
    if (val >= 1000) {
      return `${currentMeta.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (val >= 1) {
      return `${currentMeta.symbol}${val.toFixed(2)}`;
    }
    return `${currentMeta.symbol}${val.toFixed(4)}`;
  };

  // Handle Trade Execution
  const handlePlaceTrade = async (direction: 'UP' | 'DOWN') => {
    if (!user) {
      alert('Please log in to trade');
      return;
    }

    if (parsedAmountUsd <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }

    if (parsedAmountUsd > user.balance) {
      alert(`Insufficient balance! Your available balance is $${user.balance.toFixed(2)} USD.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.placeTrade({
        userId: user.id,
        symbol: currentCoin.symbol,
        direction,
        durationSeconds: selectedDuration.seconds,
        profitPercent: selectedDuration.yieldPercent,
        marginUsd: parsedAmountUsd
      });

      if (res.success && res.trade) {
        onRefreshUser();
        onTradePlaced(res.trade);
        setActiveRunningTrade(res.trade);
        setCountdownRemaining(selectedDuration.seconds);
        setTradeSettlementResult(null);
      } else {
        alert(res.error || 'Failed to place trade');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Running Trade Countdown & Auto-Settle
  useEffect(() => {
    if (!activeRunningTrade) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const safeEndTime = activeRunningTrade.endTime || (new Date(activeRunningTrade.createdAt || Date.now()).getTime() + (activeRunningTrade.durationSeconds || 60) * 1000);
      const timeLeft = Math.max(0, Math.ceil((safeEndTime - now) / 1000));
      setCountdownRemaining(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
        // Trigger settlement API
        api.settleTrade(activeRunningTrade.id).then(res => {
          if (res.success && res.trade) {
            setTradeSettlementResult({
              outcome: res.trade.outcome,
              payout: res.trade.payoutUsd
            });
            onRefreshUser();
          }
        }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRunningTrade]);

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Responsive Grid: 2 columns on PC/desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Chart & Market Data */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Top Coin Selector Card */}
          <div className="relative rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 bg-[#0b0f19] px-3.5 py-2 rounded-2xl border border-slate-700/80 hover:border-cyan-400 transition-colors shadow-sm"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: currentCoin.iconBg }}
                  >
                    {currentCoin.iconSymbol}
                  </div>
                  <span className="text-sm font-extrabold text-white">
                    {currentCoin.symbol} • {currentCoin.name}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-[#0f172a] rounded-2xl border border-slate-700 shadow-2xl z-50 divide-y divide-slate-800">
                    {tickers.map(coin => (
                      <div
                        key={coin.symbol}
                        onClick={() => {
                          onSelectSymbol(coin.symbol);
                          setDropdownOpen(false);
                        }}
                        className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: coin.iconBg }}
                          >
                            {coin.iconSymbol}
                          </div>
                          <span className="text-xs font-bold text-white">{coin.symbol}</span>
                        </div>
                        <span className="text-xs font-mono-numbers text-slate-300">
                          ${coin.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Pill */}
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black font-mono-numbers border border-emerald-500/30">
                <ArrowUp className="w-3 h-3" />
                <span>+{currentCoin.change24h}%</span>
              </div>
            </div>

            {/* Live Index Price */}
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white font-mono-numbers tracking-tight">
                {formatPrice(currentCoin.price)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Live Index Price
              </span>
            </div>
          </div>

          {/* Interactive Candlestick Chart */}
          <CandlestickChart
            candles={candles}
            currentPrice={currentCoin.price}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />

          {/* 24h Statistics Strip */}
          <div className="grid grid-cols-3 gap-2 px-1 text-center">
            <div className="bg-[#111827] p-2.5 rounded-2xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400">24h High:</div>
              <div className="text-xs font-bold text-white font-mono-numbers mt-0.5">
                {formatPrice(currentCoin.high24h)}
              </div>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-2xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400">24h Low:</div>
              <div className="text-xs font-bold text-white font-mono-numbers mt-0.5">
                {formatPrice(currentCoin.low24h)}
              </div>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-2xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400">24h Vol:</div>
              <div className="text-xs font-bold text-white font-mono-numbers mt-0.5">
                {currentCoin.volume24h}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Placement & Expiry Desk */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">

      {/* Investment Amount Desk (Screenshots 7 & 8) */}
      <div className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl space-y-4">
        {/* Available Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
            <span>$</span>
            <span>Investment Amount (USD)</span>
          </div>
          <div className="text-slate-300 font-medium font-mono-numbers">
            Available: <span className="font-extrabold text-white">{formatPrice(availableBalanceUsd)}</span>
          </div>
        </div>

        {/* Input Box */}
        <div className="relative flex items-center bg-[#0b0f19] rounded-2xl px-4 py-3 border border-slate-700/80 focus-within:border-cyan-400 transition-colors">
          <span className="text-sm font-bold text-emerald-400 mr-2">
            USD $
          </span>
          <input
            type="number"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="flex-1 bg-transparent text-lg font-black text-white font-mono-numbers focus:outline-none"
            placeholder="50"
            min="1"
          />
          <span className="text-xs font-bold text-slate-400">
            USD
          </span>
        </div>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickAmounts.map(amt => (
            <button
              key={amt}
              onClick={() => setAmountInput(amt.toString())}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                amountInput === amt.toString()
                  ? 'bg-slate-900 text-white border-2 border-slate-600 shadow-sm'
                  : 'bg-[#0f172a] text-slate-300 border border-slate-800 hover:border-slate-600'
              }`}
            >
              ${amt}
            </button>
          ))}
          <button
            onClick={() => setAmountInput(Math.floor(availableBalanceUsd).toString())}
            className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all"
          >
            MAX (USD)
          </button>
        </div>

        {/* Select Expiry Time & Profit Rate */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select Expiry Time & Profit Rate</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Guaranteed Auto Profit Active
            </span>
          </div>

          {/* Duration Cards Carousel */}
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.slice(1, 4).map(opt => {
              const isSelected = selectedDuration.seconds === opt.seconds;
              return (
                <div
                  key={opt.seconds}
                  onClick={() => setSelectedDuration(opt)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border text-center flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-[#0b0f19] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {opt.tag} - {opt.yieldPercent}%
                  </div>
                  <div className="text-lg font-black text-white font-mono-numbers my-1">
                    {opt.label}
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    +{opt.yieldPercent}% Profit
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick toggle for 30s and 300s */}
          <div className="flex items-center justify-center space-x-3 text-[11px] text-slate-400 pt-1">
            <button
              onClick={() => setSelectedDuration(DURATION_OPTIONS[0])}
              className={`hover:text-emerald-400 transition-colors ${selectedDuration.seconds === 30 ? 'font-bold text-emerald-400 underline' : ''}`}
            >
              Turbo 30s (20%)
            </button>
            <span>•</span>
            <button
              onClick={() => setSelectedDuration(DURATION_OPTIONS[4])}
              className={`hover:text-emerald-400 transition-colors ${selectedDuration.seconds === 300 ? 'font-bold text-emerald-400 underline' : ''}`}
            >
              Max Yield 300s (80%)
            </button>
          </div>
        </div>

        {/* Expected Return Preview */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b0f19] border border-slate-800">
          <div>
            <div className="text-[11px] text-slate-400">Expected Profit Return:</div>
            <div className="text-sm font-extrabold text-emerald-400 font-mono-numbers">
              +${expectedProfitUsd.toFixed(2)} (+{selectedDuration.yieldPercent}%)
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Total Est. Payout:</div>
            <div className="text-base font-black text-white font-mono-numbers">
              ${totalPayoutUsd.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Big Action Buttons (Screenshot 8) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* BUY UP */}
          <button
            onClick={() => handlePlaceTrade('UP')}
            disabled={isSubmitting}
            className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-black shadow-lg shadow-emerald-700/30 group"
          >
            <div className="flex items-center space-x-1.5 text-base">
              <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span>BUY UP ${parsedAmountUsd}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-100 opacity-90 mt-0.5">
              +{selectedDuration.yieldPercent}% Profit in {selectedDuration.label}
            </span>
          </button>

          {/* BUY DOWN */}
          <button
            onClick={() => handlePlaceTrade('DOWN')}
            disabled={isSubmitting}
            className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-white font-black shadow-lg shadow-rose-700/30 group"
          >
            <div className="flex items-center space-x-1.5 text-base">
              <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>BUY DOWN ${parsedAmountUsd}</span>
            </div>
            <span className="text-[10px] font-bold text-rose-100 opacity-90 mt-0.5">
              +{selectedDuration.yieldPercent}% Profit in {selectedDuration.label}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>

      {/* Active Running Trade Modal */}
      {activeRunningTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-slate-700 p-6 shadow-2xl text-center space-y-4 animate-scaleUp">
            {!tradeSettlementResult ? (
              <>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span>Option Contract In Execution</span>
                </div>

                <div className="relative flex items-center justify-center my-3">
                  {/* Countdown Circle */}
                  <div className="w-28 h-28 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                    <span className="text-4xl font-black text-white font-mono-numbers">
                      {countdownRemaining}s
                    </span>
                  </div>
                </div>

                <div className="bg-[#0b0f19] p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Asset:</span>
                    <span className="font-extrabold text-white">{activeRunningTrade.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Direction:</span>
                    <span className={`font-extrabold ${activeRunningTrade.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeRunningTrade.direction === 'UP' ? '↑ BUY UP' : '↓ BUY DOWN'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entry Strike:</span>
                    <span className="font-mono-numbers text-slate-200">${activeRunningTrade.entryPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Margin Escrow:</span>
                    <span className="font-mono-numbers text-amber-400">${activeRunningTrade.marginUsd} USD</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Auto-settlement will lock closing price upon timer expiry.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center space-y-2">
                  {tradeSettlementResult.outcome === 'WIN' ? (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                      <XCircle className="w-10 h-10" />
                    </div>
                  )}

                  <h3 className="text-2xl font-black text-white">
                    {tradeSettlementResult.outcome === 'WIN' ? 'TRADE WIN' : 'TRADE LOSS'}
                  </h3>

                  <p className="text-xs text-slate-300">
                    {tradeSettlementResult.outcome === 'WIN'
                      ? `Congratulations! Profit payout credited to your balance.`
                      : `The contract expired out-of-the-money.`}
                  </p>
                </div>

                <div className="bg-[#0b0f19] p-4 rounded-2xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Settlement Payout</div>
                  <div className={`text-2xl font-black font-mono-numbers mt-1 ${tradeSettlementResult.outcome === 'WIN' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    ${tradeSettlementResult.payout.toFixed(2)} USD
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveRunningTrade(null);
                    setTradeSettlementResult(null);
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm transition-all"
                >
                  Continue Trading
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

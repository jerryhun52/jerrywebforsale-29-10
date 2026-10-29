import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowUp, ArrowDown, Clock, CheckCircle2, XCircle, Check, X, Eye, ExternalLink } from 'lucide-react';
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
  onNavigateToOrders: () => void;
}

interface DurationOption {
  seconds: number;
  label: string;
  yieldPercent: number;
  tag: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { seconds: 60, label: '60s', yieldPercent: 20, tag: '20% RETURN' },
  { seconds: 120, label: '120s', yieldPercent: 30, tag: '30% RETURN' },
  { seconds: 180, label: '180s', yieldPercent: 50, tag: '50% RETURN' }
];

export const TradeTab: React.FC<TradeTabProps> = ({
  user,
  selectedSymbol,
  onSelectSymbol,
  tickers,
  currency,
  onRefreshUser,
  onTradePlaced,
  onNavigateToOrders
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('1m');
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [amountInput, setAmountInput] = useState<string>('50');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATION_OPTIONS[0]); // 60s
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Popups
  const [placedTradePopup, setPlacedTradePopup] = useState<TradeOrder | null>(null);
  const [activeRunningTrade, setActiveRunningTrade] = useState<TradeOrder | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [tradeSettlementResult, setTradeSettlementResult] = useState<{ outcome: 'WIN' | 'LOSS'; payout: number } | null>(null);
  const [tradeErrorModal, setTradeErrorModal] = useState<string | null>(null);

  const activeCurrencyCode = user?.nativeCurrency || currency || 'USD';
  const currentMeta = CURRENCIES[activeCurrencyCode] || CURRENCIES.USD;
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

  // Quick amount chips in native currency
  const quickAmounts = (activeCurrencyCode === 'INR' || activeCurrencyCode === 'PKR')
    ? [100, 500, 1000, 2500, 5000, 10000]
    : [10, 50, 100, 250, 500, 1000];

  const parsedAmount = parseFloat(amountInput) || 0;
  const availableBalance = user ? user.balance : 1000.0;
  const expectedProfit = +(parsedAmount * (selectedDuration.yieldPercent / 100)).toFixed(2);
  const totalPayout = +(parsedAmount + expectedProfit).toFixed(2);

  const formatNativeAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${currentMeta.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currentMeta.symbol}${amount.toFixed(2)}`;
  };

  const formatCoinPrice = (pUsd: number) => {
    const val = pUsd * rate;
    if (val >= 1000) {
      return `${currentMeta.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (val >= 1) {
      return `${currentMeta.symbol}${val.toFixed(2)}`;
    }
    return `${currentMeta.symbol}${val.toFixed(4)}`;
  };

  const [tradeSuccessBanner, setTradeSuccessBanner] = useState<TradeOrder | null>(null);

  // Play client trade sound
  const playTradeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Handle Trade Execution - Instant Placement
  const handlePlaceTrade = async (direction: 'UP' | 'DOWN') => {
    if (!user) {
      setTradeErrorModal('Please log in to trade');
      return;
    }

    if (parsedAmount <= 0) {
      setTradeErrorModal('Please enter a valid investment amount');
      return;
    }

    if (parsedAmount > user.balance) {
      setTradeErrorModal(`Insufficient balance! Your available balance is ${formatNativeAmount(user.balance)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const marginNative = parsedAmount;
      const marginUsdVal = activeCurrencyCode === 'USD' ? parsedAmount : +(parsedAmount / rate).toFixed(2);

      const res = await api.placeTrade({
        userId: user.id,
        symbol: currentCoin.symbol,
        direction,
        durationSeconds: selectedDuration.seconds,
        profitPercent: selectedDuration.yieldPercent,
        marginUsd: marginUsdVal,
        marginNative
      } as any);

      if (res.success && res.trade) {
        onRefreshUser();
        onTradePlaced(res.trade);
        playTradeSound();
        setPlacedTradePopup(res.trade);
      } else {
        setTradeErrorModal(res.error || 'Insufficient balance');
      }
    } catch (err: any) {
      setTradeErrorModal(err.message || 'Error executing order');
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
      {/* Responsive Grid */}
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
                {formatCoinPrice(currentCoin.price)}
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
                {formatCoinPrice(currentCoin.high24h)}
              </div>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-2xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400">24h Low:</div>
              <div className="text-xs font-bold text-white font-mono-numbers mt-0.5">
                {formatCoinPrice(currentCoin.low24h)}
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
          <div className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl space-y-4">
            {/* Available Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                <span>{currentMeta.symbol}</span>
                <span>Investment Amount ({currentMeta.code})</span>
              </div>
              <div className="text-slate-300 font-medium font-mono-numbers">
                Available: <span className="font-extrabold text-white">{formatNativeAmount(availableBalance)}</span>
              </div>
            </div>

            {/* Input Box */}
            <div className="relative flex items-center bg-[#0b0f19] rounded-2xl px-4 py-3 border border-slate-700/80 focus-within:border-cyan-400 transition-colors">
              <span className="text-sm font-bold text-emerald-400 mr-2">
                {currentMeta.code} {currentMeta.symbol}
              </span>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="flex-1 bg-transparent text-lg font-black text-white font-mono-numbers focus:outline-none"
                placeholder="50"
                min="1"
              />
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
                  {currentMeta.symbol}{amt}
                </button>
              ))}
              <button
                onClick={() => setAmountInput(Math.floor(availableBalance).toString())}
                className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all"
              >
                MAX ({currentMeta.code})
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

              {/* Duration Cards */}
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map(opt => {
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
                        {opt.tag}
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
            </div>

            {/* Expected Return Preview */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b0f19] border border-slate-800">
              <div>
                <div className="text-[11px] text-slate-400">Expected Profit Return:</div>
                <div className="text-sm font-extrabold text-emerald-400 font-mono-numbers">
                  +{formatNativeAmount(expectedProfit)} (+{selectedDuration.yieldPercent}%)
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Total Est. Payout:</div>
                <div className="text-base font-black text-white font-mono-numbers">
                  {formatNativeAmount(totalPayout)}
                </div>
              </div>
            </div>

            {/* Big Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* BUY UP */}
              <button
                onClick={() => handlePlaceTrade('UP')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-black shadow-lg shadow-emerald-700/30 group"
              >
                <div className="flex items-center space-x-1.5 text-base">
                  <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>BUY UP {formatNativeAmount(parsedAmount)}</span>
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
                  <span>BUY DOWN {formatNativeAmount(parsedAmount)}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-100 opacity-90 mt-0.5">
                  +{selectedDuration.yieldPercent}% Profit in {selectedDuration.label}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR MODAL FOR INSUFFICIENT BALANCE OR TRADING ERRORS (NO BROWSER ALERT) */}
      {tradeErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xs rounded-3xl bg-[#0c1322] border border-rose-500/50 p-6 shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center shadow-lg">
              <XCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Notice</h3>
              <p className="text-xs font-bold text-rose-300 leading-relaxed mt-1">
                {tradeErrorModal}
              </p>
            </div>
            <button
              onClick={() => setTradeErrorModal(null)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: TRADE SUCCESSFULLY PLACED WITH DIRECT 'VIEW' BUTTON */}
      {placedTradePopup && (
        <div
          onClick={() => setPlacedTradePopup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#0c1322] border border-cyan-500/50 p-5 shadow-2xl space-y-4 animate-scaleUp text-center relative"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setPlacedTradePopup(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon */}
            <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center shadow-lg ${
              placedTradePopup.direction === 'UP'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-500/20'
            }`}>
              {placedTradePopup.direction === 'UP' ? (
                <ArrowUp className="w-8 h-8 stroke-[2.5]" />
              ) : (
                <ArrowDown className="w-8 h-8 stroke-[2.5]" />
              )}
            </div>

            {/* Title & Coin Confirmation */}
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-cyan-950 text-cyan-300 border border-cyan-500/40 mb-1.5">
                <span>✓ Order Placed Smoothly</span>
              </div>
              <h3 className="text-xl font-black text-white">
                {placedTradePopup.symbol} Trade Active
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                You have entered a <strong className="text-white">{placedTradePopup.symbol}</strong> <strong className={placedTradePopup.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>{placedTradePopup.direction === 'UP' ? 'BUY UP (Green)' : 'BUY DOWN (Red)'}</strong> contract.
              </p>
            </div>

            {/* Details Box */}
            <div className="bg-[#080d17] p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Coin:</span>
                <span className="font-extrabold text-white text-sm">{placedTradePopup.symbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Invested Margin:</span>
                <span className="font-extrabold text-amber-400 text-sm">
                  {formatNativeAmount(placedTradePopup.marginUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Duration & Profit:</span>
                <span className="text-cyan-300 font-extrabold">
                  {placedTradePopup.durationSeconds}s (+{placedTradePopup.profitPercent}% Yield)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Entry Strike Price:</span>
                <span className="text-slate-200 font-bold">
                  {formatCoinPrice(placedTradePopup.entryPrice)}
                </span>
              </div>
            </div>

            {/* Action Buttons: VIEW Button & Continue */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPlacedTradePopup(null);
                  onNavigateToOrders();
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-cyan-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <Eye className="w-4 h-4 stroke-[2.5]" />
                <span>View Order / Live Countdown</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPlacedTradePopup(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Continue Trading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

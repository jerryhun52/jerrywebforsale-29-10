import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, CheckCircle, XCircle, Clock, X, Info } from 'lucide-react';
import { TradeOrder, Currency, CURRENCIES } from '../types.ts';

interface OrdersTabProps {
  trades: TradeOrder[];
  currency: Currency;
  onGoToTrade: () => void;
  onViewTradeModal?: (tradeId: string) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  trades,
  currency,
  onGoToTrade,
  onViewTradeModal
}) => {
  const [filter, setFilter] = useState<'all' | 'running' | 'settled'>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<TradeOrder | null>(null);

  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick every second for running orders
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-settle any running trade that reaches 0s
  useEffect(() => {
    runningTrades.forEach(t => {
      const expiresAtMs = t.expiresAt ? new Date(t.expiresAt).getTime() : new Date(t.createdAt).getTime() + (t.durationSeconds || 60) * 1000;
      const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
      if (secondsLeft <= 0) {
        api.settleTrade(t.id).catch(console.error);
      }
    });
  }, [now, runningTrades]);

  const runningTrades = useMemo(() => trades.filter(t => t.status === 'RUNNING'), [trades]);
  const settledTrades = useMemo(() => trades.filter(t => t.status === 'SETTLED'), [trades]);

  const displayedTrades = useMemo(() => {
    if (filter === 'running') return runningTrades;
    if (filter === 'settled') return settledTrades;
    return trades;
  }, [trades, filter, runningTrades, settledTrades]);

  const formatPrice = (pUsd: number) => {
    const val = pUsd * rate;
    if (val >= 1000) {
      return `${currentMeta.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currentMeta.symbol}${val.toFixed(2)}`;
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onGoToTrade}
              className="w-10 h-10 rounded-2xl bg-[#0b0f19] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                My Trade Orders
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {trades.length} trade order records
              </p>
            </div>
          </div>

          <button
            onClick={onGoToTrade}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Trade</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 bg-[#111827] p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({trades.length})
        </button>
        <button
          onClick={() => setFilter('running')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'running'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Running ({runningTrades.length})
        </button>
        <button
          onClick={() => setFilter('settled')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'settled'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Settled ({settledTrades.length})
        </button>
      </div>

      {/* Orders List / Empty State */}
      {displayedTrades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center bg-[#111827]/40">
          <p className="text-xs text-slate-400">
            No trade orders found in this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTrades.map(order => {
            const isUp = order.direction === 'UP';
            const isWon = order.outcome === 'WIN';
            const isSettled = order.status === 'SETTLED';

            const expiresAtMs = order.expiresAt ? new Date(order.expiresAt).getTime() : new Date(order.createdAt).getTime() + (order.durationSeconds || 60) * 1000;
            const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));

            return (
              <div
                key={order.id}
                onClick={() => {
                  setSelectedOrderDetail(order);
                  if (onViewTradeModal) onViewTradeModal(order.id);
                }}
                className="rounded-2xl bg-[#111827] hover:bg-[#152033] px-3.5 py-3 border border-slate-800 shadow-md flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
              >
                {/* Left: Coin Icon & Main Details in 1 row */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isUp ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                    {isUp ? <ArrowUp className="w-4 h-4 stroke-[2.5]" /> : <ArrowDown className="w-4 h-4 stroke-[2.5]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="text-xs sm:text-sm font-black text-white">{order.symbol}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {isUp ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-numbers mt-0.5 flex items-center space-x-1">
                      <span>Invested:</span>
                      <span className="font-extrabold text-amber-400">{formatPrice(order.marginUsd)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Live Countdown / Status Badge in 1 row */}
                <div className="flex items-center space-x-2 shrink-0">
                  {isSettled ? (
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                        isWon
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWon ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{isWon ? `WON (+${formatPrice(order.payoutUsd)})` : 'LOST'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-cyan-950 text-cyan-300 border border-cyan-500/40 animate-pulse font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>⏱️ {secondsLeft}s</span>
                    </span>
                  )}
                  <Info className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ORDER CONTRACT DETAIL POPUP WINDOW */}
      {selectedOrderDetail && (
        <div
          onClick={() => setSelectedOrderDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-[#0c1322] border border-slate-700 p-5 shadow-2xl space-y-4 animate-scaleUp text-center"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${selectedOrderDetail.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {selectedOrderDetail.direction === 'UP' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-white">{selectedOrderDetail.symbol}</h3>
                  <span className="text-[10px] text-slate-400">Contract ID: {selectedOrderDetail.id}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direction Banner */}
            <div className={`p-3 rounded-2xl border text-center font-black text-xs ${
              selectedOrderDetail.direction === 'UP'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
            }`}>
              {selectedOrderDetail.direction === 'UP' ? '🟢 BUY UP (GREEN DIRECTION)' : '🔴 BUY DOWN (RED DIRECTION)'}
            </div>

            {/* Details Table */}
            <div className="bg-[#080d17] p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Coin Bought:</span>
                <span className="font-extrabold text-white">{selectedOrderDetail.symbol}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Time Bought:</span>
                <span className="text-slate-200">
                  {selectedOrderDetail.createdAt ? new Date(selectedOrderDetail.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Invested Amount:</span>
                <span className="font-extrabold text-amber-400">
                  {formatPrice(selectedOrderDetail.marginUsd)} ({currency})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Contract Duration:</span>
                <span className="text-cyan-300 font-bold">
                  {selectedOrderDetail.durationSeconds} Seconds ({selectedOrderDetail.profitPercent}% Yield)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Entry Strike Price:</span>
                <span className="text-slate-200">{formatPrice(selectedOrderDetail.entryPrice)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Exit / Closing Price:</span>
                <span className="text-slate-200">
                  {formatPrice(selectedOrderDetail.exitPrice || selectedOrderDetail.currentPrice || selectedOrderDetail.entryPrice)}
                </span>
              </div>

              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Settlement Status:</span>
                <span className={`font-black ${
                  selectedOrderDetail.status === 'RUNNING'
                    ? 'text-blue-400'
                    : selectedOrderDetail.outcome === 'WIN'
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}>
                  {selectedOrderDetail.status === 'RUNNING' ? 'RUNNING' : selectedOrderDetail.outcome === 'WIN' ? `WIN (+${formatPrice(selectedOrderDetail.payoutUsd)})` : 'LOSS'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderDetail(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

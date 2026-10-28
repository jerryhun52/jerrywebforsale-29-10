import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { TradeOrder, Currency, CURRENCIES } from '../types.ts';

interface OrdersTabProps {
  trades: TradeOrder[];
  currency: Currency;
  onGoToTrade: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  trades,
  currency,
  onGoToTrade
}) => {
  const [filter, setFilter] = useState<'all' | 'running' | 'settled'>('all');

  const currentMeta = CURRENCIES[currency] || CURRENCIES.USD;
  const rate = currentMeta.rate;

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
      {/* Top Header Card (Screenshot 9) */}
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

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-[#111827] p-4 border border-slate-800 shadow-lg space-y-3"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">
                        {order.symbol}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {order.durationSeconds}s Option • +{order.profitPercent}% Yield
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isSettled ? (
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black ${
                        isWon
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWon ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{isWon ? `WON (+$${order.payoutUsd})` : 'LOST'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      <span>RUNNING</span>
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#0b0f19] p-2.5 rounded-2xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Entry Strike:</span>
                    <div className="font-extrabold text-white font-mono-numbers">
                      {formatPrice(order.entryPrice)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">{isSettled ? 'Settled Price:' : 'Current Price:'}</span>
                    <div className="font-extrabold text-white font-mono-numbers">
                      {formatPrice(order.exitPrice || order.currentPrice || order.entryPrice)}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400">Invested Margin:</span>
                    <div className="font-extrabold text-amber-400 font-mono-numbers">
                      {formatPrice(order.marginUsd)}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400">Total Payout:</span>
                    <div className={`font-black font-mono-numbers ${isSettled && isWon ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {isSettled ? formatPrice(order.payoutUsd) : `Est: ${formatPrice(order.marginUsd * (1 + order.profitPercent / 100))}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

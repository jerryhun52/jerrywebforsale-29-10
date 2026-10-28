import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, CheckCircle, XCircle, Clock, X, Info } from 'lucide-react';
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
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<TradeOrder | null>(null);

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

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderDetail(order)}
                className="rounded-3xl bg-[#111827] hover:bg-[#152033] p-4 border border-slate-800 shadow-lg space-y-3 cursor-pointer transition-all active:scale-[0.99] group"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center space-x-1.5">
                        <span>{order.symbol}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {isUp ? 'BUY UP (GREEN)' : 'BUY DOWN (RED)'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {order.durationSeconds}s Duration • +{order.profitPercent}% Profit
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
                      <span>{isWon ? `WON (+${formatPrice(order.payoutUsd)})` : 'LOST'}</span>
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
                    <span className="text-[10px] text-slate-400">Invested Amount:</span>
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

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Tap to view order contract detail window</span>
                  <Info className="w-3 h-3 text-cyan-400" />
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

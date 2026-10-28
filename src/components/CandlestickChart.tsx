import React, { useMemo } from 'react';
import { Candlestick } from '../types.ts';

interface CandlestickChartProps {
  candles: Candlestick[];
  currentPrice: number;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  currentPrice,
  timeframe,
  onTimeframeChange
}) => {
  const timeframes = ['1m', '5m', '15m', '1h'];

  const { minPrice, maxPrice, maPoints, renderedCandles, volumeMax } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 1, maPoints: '', renderedCandles: [], volumeMax: 100 };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    candles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    if (currentPrice < min) min = currentPrice;
    if (currentPrice > max) max = currentPrice;

    // Buffer padding
    const padding = (max - min) * 0.08 || 5;
    const chartMin = min - padding;
    const chartMax = max + padding;
    const priceRange = chartMax - chartMin || 1;

    const chartHeight = 220;
    const chartWidth = 360;
    const candleWidth = Math.max(3, (chartWidth / candles.length) * 0.65);
    const stepX = chartWidth / (candles.length || 1);

    // Compute 7-period moving average
    const maWindow = 5;
    const maCoords: Array<{ x: number; y: number }> = [];

    const computedCandles = candles.map((c, index) => {
      const x = index * stepX + stepX / 2;
      const yOpen = chartHeight - ((c.open - chartMin) / priceRange) * chartHeight;
      const yClose = chartHeight - ((c.close - chartMin) / priceRange) * chartHeight;
      const yHigh = chartHeight - ((c.high - chartMin) / priceRange) * chartHeight;
      const yLow = chartHeight - ((c.low - chartMin) / priceRange) * chartHeight;

      const isBull = c.close >= c.open;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

      // Volume bar
      const volHeight = (c.volume / (maxVol || 1)) * 36;
      const volY = chartHeight - volHeight;

      // MA calculation
      if (index >= maWindow - 1) {
        let sum = 0;
        for (let k = 0; k < maWindow; k++) {
          sum += candles[index - k].close;
        }
        const maVal = sum / maWindow;
        const maY = chartHeight - ((maVal - chartMin) / priceRange) * chartHeight;
        maCoords.push({ x, y: maY });
      }

      return {
        x,
        yHigh,
        yLow,
        bodyTop,
        bodyHeight,
        candleWidth,
        isBull,
        volY,
        volHeight,
        candle: c
      };
    });

    let maPath = '';
    if (maCoords.length > 0) {
      maPath = `M ${maCoords[0].x} ${maCoords[0].y} ` +
        maCoords.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    return {
      minPrice: chartMin,
      maxPrice: chartMax,
      maPoints: maPath,
      renderedCandles: computedCandles,
      volumeMax: maxVol
    };
  }, [candles, currentPrice]);

  const priceRange = maxPrice - minPrice || 1;
  const chartHeight = 220;
  const currentPriceY = chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight;

  // Horizontal price grid lines
  const gridLevels = [0.15, 0.4, 0.65, 0.9].map(pct => {
    const val = minPrice + pct * priceRange;
    const y = chartHeight - pct * chartHeight;
    return { val, y };
  });

  return (
    <div className="w-full bg-[#111827]/90 rounded-2xl p-3 border border-slate-800/80 shadow-lg select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Candlestick Feed</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[230px] overflow-hidden">
        <svg
          viewBox="0 0 360 220"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="volBullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="volBearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines and prices */}
          {gridLevels.map((lvl, i) => (
            <g key={i}>
              <line
                x1="0"
                y1={lvl.y}
                x2="310"
                y2={lvl.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x="356"
                y={lvl.y + 3}
                fill="#64748b"
                fontSize="9"
                textAnchor="end"
                className="font-mono-numbers"
              >
                {lvl.val.toFixed(lvl.val < 1 ? 4 : 1)}
              </text>
            </g>
          ))}

          {/* Volume Bars */}
          {renderedCandles.map((rc, i) => (
            <rect
              key={`vol-${i}`}
              x={rc.x - rc.candleWidth / 2}
              y={rc.volY}
              width={rc.candleWidth}
              height={rc.volHeight}
              fill={rc.isBull ? 'url(#volBullGrad)' : 'url(#volBearGrad)'}
            />
          ))}

          {/* Candlesticks */}
          {renderedCandles.map((rc, i) => (
            <g key={`candle-${i}`}>
              {/* Wick */}
              <line
                x1={rc.x}
                y1={rc.yHigh}
                x2={rc.x}
                y2={rc.yLow}
                stroke={rc.isBull ? '#10b981' : '#f43f5e'}
                strokeWidth="1.2"
              />
              {/* Body */}
              <rect
                x={rc.x - rc.candleWidth / 2}
                y={rc.bodyTop}
                width={rc.candleWidth}
                height={rc.bodyHeight}
                fill={rc.isBull ? '#10b981' : '#f43f5e'}
                rx="0.5"
              />
            </g>
          ))}

          {/* Moving Average Line */}
          {maPoints && (
            <path
              d={maPoints}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Live Current Price Line & Tag */}
          <line
            x1="0"
            y1={currentPriceY}
            x2="300"
            y2={currentPriceY}
            stroke="#10b981"
            strokeDasharray="2 2"
            strokeWidth="1.2"
          />

          <g transform={`translate(295, ${Math.max(10, Math.min(205, currentPriceY - 8))})`}>
            <rect
              x="0"
              y="0"
              width="62"
              height="16"
              rx="3"
              fill="#10b981"
            />
            <text
              x="31"
              y="11.5"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono-numbers"
            >
              {currentPrice.toFixed(currentPrice < 1 ? 4 : 0)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

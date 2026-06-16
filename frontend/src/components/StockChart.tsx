import { useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { PricePoint, StockPrice } from '../types';

interface Props {
  ticker: string;
  history: PricePoint[];
  currentPrice: StockPrice | undefined;
  onClose: () => void;
}

export function StockChart({ ticker, history, currentPrice, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPositive = currentPrice ? currentPrice.change >= 0 : true;
  const lineColor = isPositive ? '#3fb950' : '#f85149';

  const prices = history.map((p) => p.price);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const pad = (maxP - minP) * 0.2 || maxP * 0.005 || 1;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`${ticker} price chart`}
    >
      <div className="chart-modal">
        <div className="chart-modal-header">
          <div className="chart-modal-title">
            <span className="chart-ticker-label">{ticker}</span>
            {currentPrice && (
              <>
                <span className="chart-current-price">${currentPrice.price.toFixed(2)}</span>
                <span className={`chart-inline-change ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '▲' : '▼'} {Math.abs(currentPrice.change).toFixed(2)}&nbsp;
                  ({isPositive ? '+' : ''}{currentPrice.changePercent.toFixed(3)}%)
                </span>
              </>
            )}
          </div>
          <button className="chart-close-btn" onClick={onClose} aria-label="Close chart">✕</button>
        </div>

        <div className="chart-body">
          {history.length < 2 ? (
            <div className="chart-empty">
              {history.length === 0
                ? 'Subscribe to this stock to see live data'
                : 'Waiting for more data…'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#7d8590' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  domain={[minP - pad, maxP + pad]}
                  tick={{ fontSize: 10, fill: '#7d8590' }}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  axisLine={false}
                  tickLine={false}
                  width={76}
                />
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#e6edf3',
                  }}
                  labelStyle={{ color: '#7d8590', marginBottom: 4 }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill={`url(#grad-${ticker})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-footer">
          {history.length > 0
            ? `${history.length} of 60 data points · live · updates every second`
            : 'Click Watch to start receiving live prices'}
        </div>
      </div>
    </div>
  );
}

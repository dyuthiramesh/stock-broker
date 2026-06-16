import { StockPrice } from '../types';

interface StockCardProps {
  ticker: string;
  price: StockPrice | undefined;
  subscribed: boolean;
  onSubscribe: (ticker: string) => void;
  onUnsubscribe: (ticker: string) => void;
  onClick?: () => void;
}

export function StockCard({ ticker, price, subscribed, onSubscribe, onUnsubscribe, onClick }: StockCardProps) {
  const isPositive = price ? price.change >= 0 : true;
  const changeClass = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div
      className={`stock-card ${subscribed ? 'subscribed' : ''}`}
      data-testid={`stock-card-${ticker}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="stock-card-header">
        <span className="stock-ticker">{ticker}</span>
        <button
          className={subscribed ? 'btn btn-unsubscribe' : 'btn btn-subscribe'}
          onClick={(e) => {
            e.stopPropagation();
            subscribed ? onUnsubscribe(ticker) : onSubscribe(ticker);
          }}
          aria-label={subscribed ? `Unwatch ${ticker}` : `Watch ${ticker}`}
        >
          {subscribed ? '− Unwatch' : '+ Watch'}
        </button>
      </div>

      {subscribed && price ? (
        <div className="stock-card-body">
          <div className="stock-price">${price.price.toFixed(2)}</div>
          <div className={`stock-change ${changeClass}`}>
            {arrow} {Math.abs(price.change).toFixed(2)} ({isPositive ? '+' : ''}{price.changePercent.toFixed(3)}%)
          </div>
          <div className="stock-timestamp">
            {new Date(price.timestamp).toLocaleTimeString()}
          </div>
          {onClick && <div className="stock-card-hint">Click to view chart</div>}
        </div>
      ) : subscribed ? (
        <div className="stock-card-body">
          <div className="stock-price-placeholder">Loading…</div>
        </div>
      ) : (
        <div className="stock-card-body stock-card-idle">
          <span>Not watching</span>
        </div>
      )}
    </div>
  );
}

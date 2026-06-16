import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStockFeed } from '../hooks/useStockFeed';
import { StockCard } from './StockCard';
import { StockChart } from './StockChart';
import { ConnectionStatus } from './ConnectionStatus';
import { SUPPORTED_TICKERS } from '../constants';

export function Dashboard() {
  const { user, token, logout } = useAuth();
  const { prices, priceHistory, subscriptions, connected, loading, error, subscribe, unsubscribe } =
    useStockFeed(token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const handleSubscribe = useCallback(
    async (ticker: string) => {
      setActionError(null);
      try {
        await subscribe(ticker);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to subscribe');
      }
    },
    [subscribe]
  );

  const handleUnsubscribe = useCallback(
    async (ticker: string) => {
      setActionError(null);
      try {
        await unsubscribe(ticker);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to unsubscribe');
      }
    },
    [unsubscribe]
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-logo">📈</span>
          <h1>Stock Dashboard</h1>
        </div>
        <div className="header-right">
          <ConnectionStatus connected={connected} />
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <button className="btn btn-logout" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {loading && (
          <div className="status-banner info" role="status">
            Connecting to live feed…
          </div>
        )}
        {error && (
          <div className="status-banner error" role="alert">
            Connection error: {error}
          </div>
        )}
        {actionError && (
          <div className="status-banner error" role="alert">
            {actionError}
          </div>
        )}

        {subscriptions.length === 0 && !loading && (
          <div className="empty-state">
            <p>You have no watched stocks.</p>
            <p>Click <strong>+ Watch</strong> on any ticker below to start tracking it.</p>
          </div>
        )}

        <section className="stocks-grid" aria-label="Stock tickers">
          {SUPPORTED_TICKERS.map((ticker) => (
            <StockCard
              key={ticker}
              ticker={ticker}
              price={prices.get(ticker)}
              subscribed={subscriptions.includes(ticker)}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
              onClick={() => setSelectedTicker(ticker)}
            />
          ))}
        </section>
      </main>

      {selectedTicker && (
        <StockChart
          ticker={selectedTicker}
          history={priceHistory.get(selectedTicker) ?? []}
          currentPrice={prices.get(selectedTicker)}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
}

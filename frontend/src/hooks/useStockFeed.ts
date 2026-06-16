import { useEffect, useRef, useState, useCallback } from 'react';
import { StockPrice, WsMessage, PricePoint } from '../types';
import { StockWebSocket } from '../services/websocket';
import { api } from '../services/api';

const MAX_HISTORY = 60;

interface StockFeedState {
  prices: Map<string, StockPrice>;
  priceHistory: Map<string, PricePoint[]>;
  subscriptions: string[];
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export function useStockFeed(token: string | null) {
  const [state, setState] = useState<StockFeedState>({
    prices: new Map(),
    priceHistory: new Map(),
    subscriptions: [],
    connected: false,
    loading: false,
    error: null,
  });

  const wsRef = useRef<StockWebSocket | null>(null);

  const updatePrices = useCallback((incoming: StockPrice[]) => {
    setState((prev) => {
      const nextPrices = new Map(prev.prices);
      const nextHistory = new Map(prev.priceHistory);
      const time = new Date().toLocaleTimeString();
      for (const p of incoming) {
        nextPrices.set(p.ticker, p);
        const existing = nextHistory.get(p.ticker) ?? [];
        nextHistory.set(p.ticker, [...existing, { price: p.price, time }].slice(-MAX_HISTORY));
      }
      return { ...prev, prices: nextPrices, priceHistory: nextHistory };
    });
  }, []);

  const handleMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.type === 'authenticated') {
        setState((prev) => ({
          ...prev,
          subscriptions: msg.subscriptions,
          loading: false,
        }));
        updatePrices(msg.prices);
      } else if (msg.type === 'price_update') {
        updatePrices([msg]);
      } else if (msg.type === 'subscriptions_updated') {
        setState((prev) => ({ ...prev, subscriptions: msg.subscriptions }));
        updatePrices(msg.prices);
      } else if (msg.type === 'error') {
        setState((prev) => ({ ...prev, error: msg.message }));
      }
    },
    [updatePrices]
  );

  const handleStatus = useCallback((connected: boolean) => {
    setState((prev) => ({ ...prev, connected }));
  }, []);

  useEffect(() => {
    if (!token) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    const ws = new StockWebSocket(token, handleMessage, handleStatus);
    wsRef.current = ws;
    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [token, handleMessage, handleStatus]);

  const subscribe = useCallback(
    async (ticker: string) => {
      if (!token) return;
      await api.subscribe(token, ticker);
    },
    [token]
  );

  const unsubscribe = useCallback(
    async (ticker: string) => {
      if (!token) return;
      await api.unsubscribe(token, ticker);
    },
    [token]
  );

  return {
    prices: state.prices,
    priceHistory: state.priceHistory,
    subscriptions: state.subscriptions,
    connected: state.connected,
    loading: state.loading,
    error: state.error,
    subscribe,
    unsubscribe,
  };
}

export interface User {
  id: number;
  email: string;
}

export interface StockPrice {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export type WsMessage =
  | { type: 'connected'; message: string }
  | { type: 'authenticated'; userId: number; email: string; subscriptions: string[]; prices: StockPrice[] }
  | { type: 'price_update'; ticker: string; price: number; change: number; changePercent: number; timestamp: string }
  | { type: 'subscriptions_updated'; subscriptions: string[]; prices: StockPrice[] }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface PricePoint {
  price: number;
  time: string;
}

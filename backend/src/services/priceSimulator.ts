import { EventEmitter } from 'events';

export const SUPPORTED_TICKERS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'] as const;
export type Ticker = (typeof SUPPORTED_TICKERS)[number];

export interface StockPrice {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Realistic baseline prices
const BASE_PRICES: Record<string, number> = {
  GOOG: 175.5,
  TSLA: 245.3,
  AMZN: 185.2,
  META: 510.8,
  NVDA: 875.4,
};

// Volatility per ticker (% of price per tick)
const VOLATILITY: Record<string, number> = {
  GOOG: 0.002,
  TSLA: 0.005,
  AMZN: 0.002,
  META: 0.003,
  NVDA: 0.004,
};

export class PriceSimulator extends EventEmitter {
  private prices: Map<string, number> = new Map();
  private openPrices: Map<string, number> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly tickInterval: number;

  constructor(tickInterval = 1000) {
    super();
    this.tickInterval = tickInterval;

    for (const ticker of SUPPORTED_TICKERS) {
      const base = BASE_PRICES[ticker];
      this.prices.set(ticker, base);
      this.openPrices.set(ticker, base);
    }
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.tickInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getAllPrices(): StockPrice[] {
    return SUPPORTED_TICKERS.map((ticker) => this.buildStockPrice(ticker));
  }

  getPrice(ticker: string): StockPrice | null {
    if (!this.prices.has(ticker)) return null;
    return this.buildStockPrice(ticker);
  }

  private tick(): void {
    for (const ticker of SUPPORTED_TICKERS) {
      const current = this.prices.get(ticker)!;
      const vol = VOLATILITY[ticker];
      // Random walk: ±volatility * current price
      const delta = (Math.random() * 2 - 1) * vol * current;
      const next = Math.max(0.01, parseFloat((current + delta).toFixed(2)));
      this.prices.set(ticker, next);

      const stockPrice = this.buildStockPrice(ticker);
      this.emit('price', stockPrice);
    }
  }

  private buildStockPrice(ticker: string): StockPrice {
    const price = this.prices.get(ticker)!;
    const open = this.openPrices.get(ticker)!;
    const change = parseFloat((price - open).toFixed(2));
    const changePercent = parseFloat(((change / open) * 100).toFixed(3));

    return {
      ticker,
      price,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance shared across the app
export const priceSimulator = new PriceSimulator();

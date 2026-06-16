import { getDb } from '../db/database';
import { SUPPORTED_TICKERS } from '../services/priceSimulator';

export interface Subscription {
  id: number;
  user_id: number;
  ticker: string;
  created_at: string;
}

export const SubscriptionModel = {
  getByUserId(userId: number): Subscription[] {
    const stmt = getDb().prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY ticker'
    );
    return stmt.all(userId) as unknown as Subscription[];
  },

  getTickersByUserId(userId: number): string[] {
    const stmt = getDb().prepare(
      'SELECT ticker FROM subscriptions WHERE user_id = ? ORDER BY ticker'
    );
    const rows = stmt.all(userId) as unknown as { ticker: string }[];
    return rows.map((r) => r.ticker);
  },

  create(userId: number, ticker: string): Subscription {
    if (!SUPPORTED_TICKERS.includes(ticker as never)) {
      throw new Error(`Unsupported ticker: ${ticker}`);
    }
    const db = getDb();
    const stmt = db.prepare('INSERT INTO subscriptions (user_id, ticker) VALUES (?, ?)');
    const result = stmt.run(userId, ticker);
    return db
      .prepare('SELECT * FROM subscriptions WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as Subscription;
  },

  delete(userId: number, ticker: string): boolean {
    const stmt = getDb().prepare(
      'DELETE FROM subscriptions WHERE user_id = ? AND ticker = ?'
    );
    const result = stmt.run(userId, ticker);
    return result.changes > 0;
  },

  exists(userId: number, ticker: string): boolean {
    const stmt = getDb().prepare(
      'SELECT 1 FROM subscriptions WHERE user_id = ? AND ticker = ?'
    );
    return stmt.get(userId, ticker) !== undefined;
  },
};

import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { SubscriptionModel } from '../models/subscription';
import { SUPPORTED_TICKERS } from '../services/priceSimulator';
import { getWsManager } from '../services/wsManager';

const tickerSchema = z.object({
  ticker: z.string().toUpperCase().refine((t) => SUPPORTED_TICKERS.includes(t as never), {
    message: `Ticker must be one of: ${SUPPORTED_TICKERS.join(', ')}`,
  }),
});

export function getSubscriptions(req: AuthRequest, res: Response): void {
  const userId = req.user!.userId;
  const subscriptions = SubscriptionModel.getByUserId(userId);
  res.json({ subscriptions: subscriptions.map((s) => s.ticker) });
}

export function subscribe(req: AuthRequest, res: Response): void {
  const userId = req.user!.userId;
  const result = tickerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { ticker } = result.data;

  if (SubscriptionModel.exists(userId, ticker)) {
    res.status(409).json({ error: `Already subscribed to ${ticker}` });
    return;
  }

  const subscription = SubscriptionModel.create(userId, ticker);
  getWsManager()?.notifySubscriptionChange(userId);
  res.status(201).json({ subscription: subscription.ticker });
}

export function unsubscribe(req: AuthRequest, res: Response): void {
  const userId = req.user!.userId;
  const ticker = req.params.ticker?.toUpperCase();

  if (!ticker || !SUPPORTED_TICKERS.includes(ticker as never)) {
    res.status(400).json({ error: `Ticker must be one of: ${SUPPORTED_TICKERS.join(', ')}` });
    return;
  }

  const deleted = SubscriptionModel.delete(userId, ticker);
  if (!deleted) {
    res.status(404).json({ error: `Not subscribed to ${ticker}` });
    return;
  }

  getWsManager()?.notifySubscriptionChange(userId);
  res.json({ message: `Unsubscribed from ${ticker}` });
}

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { priceSimulator, SUPPORTED_TICKERS } from '../services/priceSimulator';

export function getAllPrices(_req: AuthRequest, res: Response): void {
  const prices = priceSimulator.getAllPrices();
  res.json({ prices, tickers: SUPPORTED_TICKERS });
}

export function getPrice(req: AuthRequest, res: Response): void {
  const ticker = req.params.ticker?.toUpperCase();
  const price = priceSimulator.getPrice(ticker);
  if (!price) {
    res.status(404).json({ error: `Unknown ticker: ${ticker}` });
    return;
  }
  res.json({ price });
}

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscriptions';
import stockRoutes from './routes/stocks';
import { SUPPORTED_TICKERS } from './services/priceSimulator';

export function createApp() {
  const app = express();

  // CORS_ORIGIN can be a comma-separated list, e.g.:
  //   https://frontend.onrender.com,http://localhost:5173
  const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const corsOrigins = rawOrigins.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', tickers: SUPPORTED_TICKERS });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/stocks', stockRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

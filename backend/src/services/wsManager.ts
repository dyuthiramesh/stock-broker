import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { verifyToken, JwtPayload } from './authService';
import { SubscriptionModel } from '../models/subscription';
import { priceSimulator, StockPrice } from './priceSimulator';

interface AuthenticatedClient {
  ws: WebSocket;
  userId: number;
  email: string;
}

type ClientMessage =
  | { type: 'authenticate'; token: string }
  | { type: 'subscribe'; ticker: string }
  | { type: 'unsubscribe'; ticker: string }
  | { type: 'ping' };

export class WsManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, AuthenticatedClient | null> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.onConnection(ws, req);
    });

    priceSimulator.on('price', (stockPrice: StockPrice) => {
      this.broadcastPrice(stockPrice);
    });
  }

  private onConnection(ws: WebSocket, _req: IncomingMessage): void {
    this.clients.set(ws, null);

    ws.on('message', (data) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      } catch {
        this.send(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', () => {
      this.clients.delete(ws);
    });

    // Ask client to authenticate
    this.send(ws, { type: 'connected', message: 'Please authenticate' });
  }

  private handleMessage(ws: WebSocket, msg: ClientMessage): void {
    if (msg.type === 'authenticate') {
      this.handleAuth(ws, msg.token);
      return;
    }

    const client = this.clients.get(ws);
    if (!client) {
      this.send(ws, { type: 'error', message: 'Not authenticated' });
      return;
    }

    if (msg.type === 'ping') {
      this.send(ws, { type: 'pong' });
      return;
    }
  }

  private handleAuth(ws: WebSocket, token: string): void {
    try {
      const payload: JwtPayload = verifyToken(token);
      const client: AuthenticatedClient = {
        ws,
        userId: payload.userId,
        email: payload.email,
      };
      this.clients.set(ws, client);

      // Send current subscribed prices immediately
      const tickers = SubscriptionModel.getTickersByUserId(payload.userId);
      const prices = priceSimulator.getAllPrices().filter((p) => tickers.includes(p.ticker));

      this.send(ws, {
        type: 'authenticated',
        userId: payload.userId,
        email: payload.email,
        subscriptions: tickers,
        prices,
      });
    } catch {
      this.send(ws, { type: 'error', message: 'Invalid or expired token' });
      ws.close();
    }
  }

  private broadcastPrice(stockPrice: StockPrice): void {
    for (const [ws, client] of this.clients) {
      if (!client || ws.readyState !== WebSocket.OPEN) continue;

      const tickers = SubscriptionModel.getTickersByUserId(client.userId);
      if (tickers.includes(stockPrice.ticker)) {
        this.send(ws, { type: 'price_update', ...stockPrice });
      }
    }
  }

  // Called when a user's subscriptions change so the next broadcast picks it up
  notifySubscriptionChange(userId: number): void {
    for (const [ws, client] of this.clients) {
      if (!client || client.userId !== userId || ws.readyState !== WebSocket.OPEN) continue;

      const tickers = SubscriptionModel.getTickersByUserId(userId);
      const prices = priceSimulator.getAllPrices().filter((p) => tickers.includes(p.ticker));
      this.send(ws, { type: 'subscriptions_updated', subscriptions: tickers, prices });
    }
  }

  private send(ws: WebSocket, data: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

let wsManagerInstance: WsManager | null = null;

export function initWsManager(server: Server): WsManager {
  wsManagerInstance = new WsManager(server);
  return wsManagerInstance;
}

export function getWsManager(): WsManager | null {
  return wsManagerInstance;
}

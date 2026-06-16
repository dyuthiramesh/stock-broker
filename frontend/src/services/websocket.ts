import { WsMessage } from '../types';

type MessageHandler = (msg: WsMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class StockWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private onMessage: MessageHandler;
  private onStatus: StatusHandler;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private closed = false;

  constructor(token: string, onMessage: MessageHandler, onStatus: StatusHandler) {
    this.token = token;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // In production, derive wss:// URL from the backend env var.
    // In dev, fall back to window.location.host so Vite's /ws proxy is used.
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const wsUrl = backendUrl
      ? backendUrl.replace(/^https/, 'wss').replace(/^http$/, 'ws') + '/ws'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Authenticate immediately on connect
      this.send({ type: 'authenticate', token: this.token });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'authenticated') {
          this.onStatus(true);
          this.startPing();
        }
        this.onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.onStatus(false);
      if (!this.closed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws?.close();
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }
}

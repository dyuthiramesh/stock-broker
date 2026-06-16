import http from 'http';
import { createApp } from './app';
import { initWsManager } from './services/wsManager';
import { priceSimulator } from './services/priceSimulator';
import { getDb } from './db/database';

const PORT = process.env.PORT || 3001;

const app = createApp();
const server = http.createServer(app);

// Initialize DB
getDb();

// Initialize WebSocket manager
initWsManager(server);

// Start price simulator
priceSimulator.start();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  priceSimulator.stop();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  priceSimulator.stop();
  server.close(() => process.exit(0));
});

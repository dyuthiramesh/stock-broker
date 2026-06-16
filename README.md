# Stock Broker Client Web Dashboard

A real-time stock price dashboard. Users log in with their email, subscribe to stock tickers, and watch prices update live every second — no page refresh required. Multiple users can run independent dashboards simultaneously with different subscriptions.

---

## Project Overview

- **Email-only login** — enter your email to get a session (no password required)
- **5 supported tickers**: GOOG, TSLA, AMZN, META, NVDA
- **Live prices** via WebSocket — updates every second per subscribed ticker
- **Live price chart** — click any stock card to open a real-time area chart (rolling 60-second history)
- **Per-user subscriptions** — each user sees only the tickers they chose
- **Persistent** — subscriptions survive page refresh and server restart
- **Multi-user** — multiple browser tabs with different accounts update independently

---

## Architecture Summary

```text
┌──────────────────────────┐   REST (HTTP)    ┌──────────────────────────────────────┐
│   React Frontend          │ ◄─────────────► │  Express Backend (Node.js/TypeScript) │
│   Vite + TypeScript       │                 │                                      │
│                           │   WebSocket     │  ┌─────────────────────────────────┐ │
│  AuthContext (JWT+LS)     │ ◄─────────────► │  │ PriceSimulator (EventEmitter)   │ │
│  useStockFeed (WS hook)   │                 │  │ Random walk, 1-second ticks     │ │
│  Dashboard / StockCard    │                 │  └──────────────┬──────────────────┘ │
└──────────────────────────┘                 │                 │ price events         │
                                             │  ┌──────────────▼──────────────────┐ │
                                             │  │ WsManager — per-user fan-out    │ │
                                             │  │ Checks subscriptions per client │ │
                                             │  └─────────────────────────────────┘ │
                                             │                                      │
                                             │  SQLite (node:sqlite built-in)       │
                                             │  • users  • subscriptions            │
                                             └──────────────────────────────────────┘
```

**Key flows:**

1. User submits email → JWT issued → stored in `localStorage`
2. Frontend opens WebSocket → sends `{ type: 'authenticate', token }` immediately
3. Backend verifies JWT → responds with current subscriptions + snapshot prices
4. `PriceSimulator` emits `price` event every 1 second for all 5 tickers
5. `WsManager` fans price events only to clients subscribed to that ticker
6. Subscribe/Unsubscribe via REST → backend pushes `subscriptions_updated` over WS

---

## Technology Choices and Rationale

| Layer | Choice | Why |
| --- | --- | --- |
| Backend runtime | Node.js 22+ + TypeScript | Native `node:sqlite` (no compilation), ideal for real-time event-driven patterns |
| HTTP framework | Express | Minimal, well-understood, straightforward to test |
| WebSockets | `ws` library | Lightweight, battle-tested, no framework lock-in vs Socket.IO |
| Database | `node:sqlite` (built-in) | Zero install, synchronous API fits Node's single thread, no native compilation |
| Auth | JWT (HS256) | Stateless — verifiable in WebSocket handshake without a DB round-trip |
| Frontend | React 18 + TypeScript + Vite | Industry standard; fast HMR; type-safe component model |
| Charting | recharts | Composable React chart library; AreaChart with live data and no animation flicker |
| Validation | Zod | Schema-first, infers TypeScript types from runtime validators |
| Testing — backend | **Jest + ts-jest + Supertest** | No Vite bundler in the chain; native Node.js module resolution (important for `node:sqlite`) |
| Testing — frontend | **Vitest + React Testing Library** | Vite-native, fast, excellent React support |
| Containerization | Docker + Docker Compose + nginx | Reproducible one-command deploy |

---

## Prerequisites

- **Node.js 22 or later** — required for the built-in `node:sqlite` module
  - Check: `node --version` (must be ≥ 22)
- **npm 10+** — `npm --version`
- **Docker + Docker Compose** — optional, for containerized run

---

## Local Setup Instructions

```bash
# 1. Clone / enter the project
cd stock-broker

# 2. Install all dependencies (backend + frontend)
npm run install:all
```

---

## How to Run the Application

### Option A — Local development (recommended)

Open **two terminals**:

```bash
# Terminal 1 — Backend API + WebSocket server (port 3001)
cd stock-broker/backend
npm run dev

# Terminal 2 — Frontend dev server (port 5173, proxies to backend)
cd stock-broker/frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**To test multiple simultaneous users:** open the dashboard in two different browsers (or normal + incognito), log in with different emails, and subscribe to different tickers. Both dashboards update independently in real time.

### Option B — Docker Compose

```bash
cd stock-broker
docker-compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:3001/api/health](http://localhost:3001/api/health)

```bash
docker-compose down        # stop
docker-compose down -v     # stop + remove database volume
```

---

## How to Run Tests

### All tests (backend + frontend)

```bash
cd stock-broker
npm test
```

### Backend tests only (Jest)

```bash
cd stock-broker/backend
npm test

# With coverage
npm run test:coverage
```

### Frontend tests only (Vitest)

```bash
cd stock-broker/frontend
npm test

# With coverage
npm run test:coverage
```

### Watch mode during development

```bash
# Backend
cd backend && npm run test:watch

# Frontend
cd frontend && npm run test:watch
```

**Backend test suite (25 tests, Jest + Supertest):**

- `auth.test.ts` — login, email normalization, idempotency, validation errors
- `subscriptions.test.ts` — CRUD, per-user isolation, duplicate prevention, unsupported tickers
- `stocks.test.ts` — price endpoints, authentication gates
- `priceSimulator.test.ts` — price generation, tick behavior, event emission, stop/start

**Frontend test suite (17 tests, Vitest + React Testing Library):**

- `LoginForm.test.tsx` — rendering, validation, API calls, loading state, error display
- `StockCard.test.tsx` — all card states, subscribe/unsubscribe callbacks, change color coding
- `ConnectionStatus.test.tsx` — connected/disconnected rendering and ARIA

---

## Project Structure

```text
stock-broker/
├── backend/
│   ├── src/
│   │   ├── controllers/            # Request handlers (thin — delegate to services/models)
│   │   │   ├── authController.ts
│   │   │   ├── subscriptionController.ts
│   │   │   └── stockController.ts
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT Bearer token verification
│   │   ├── models/
│   │   │   ├── user.ts             # DB queries for users table
│   │   │   └── subscription.ts     # DB queries for subscriptions table
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── stocks.ts
│   │   ├── services/
│   │   │   ├── authService.ts      # JWT sign/verify + Zod email schema
│   │   │   ├── priceSimulator.ts   # EventEmitter-based random walk price engine
│   │   │   └── wsManager.ts        # WebSocket lifecycle + per-user price fan-out
│   │   ├── db/
│   │   │   └── database.ts         # node:sqlite singleton + migration
│   │   ├── app.ts                  # Express factory (side-effect free — testable)
│   │   └── index.ts                # Entry point: server, WS, simulator startup
│   ├── tests/
│   │   ├── setup.ts                # Sets DB_PATH=:memory: + JWT_SECRET for isolation
│   │   ├── auth.test.ts
│   │   ├── subscriptions.test.ts
│   │   ├── stocks.test.ts
│   │   └── priceSimulator.test.ts
│   ├── Dockerfile
│   ├── jest.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # Authenticated main view
│   │   │   ├── LoginForm.tsx       # Email login screen
│   │   │   ├── StockCard.tsx       # Per-ticker card with live price + subscribe button
│   │   │   ├── StockChart.tsx      # Modal area chart — opens on card click
│   │   │   └── ConnectionStatus.tsx # Live/Reconnecting WS status indicator
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Auth state + localStorage persistence
│   │   ├── hooks/
│   │   │   └── useStockFeed.ts     # WS lifecycle, price Map, rolling price history
│   │   ├── services/
│   │   │   ├── api.ts              # Typed REST API client
│   │   │   └── websocket.ts        # WS client with exponential backoff reconnect
│   │   ├── types/
│   │   │   └── index.ts            # Shared TypeScript types
│   │   ├── constants.ts            # SUPPORTED_TICKERS
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css              # Dark-themed dashboard CSS (no framework)
│   ├── tests/
│   │   ├── setup.ts
│   │   ├── LoginForm.test.tsx
│   │   ├── StockCard.test.tsx
│   │   └── ConnectionStatus.test.tsx
│   ├── Dockerfile
│   ├── nginx.conf                  # WS proxy + SPA fallback
│   ├── vite.config.ts
│   └── package.json
│
├── .gitignore
├── docker-compose.yml
├── package.json                    # Root convenience scripts
├── README.md                       ← you are here
└── implementation.md               # Technical decisions and trade-offs
```

---

## Assumptions

1. **Email-only authentication** — the spec says "login using their email address." No password is needed. A JWT is issued on email entry; users are created on first login (upsert).
2. **Simulated prices only** — prices use a random-walk model seeded from realistic baselines (GOOG ≈ $175, TSLA ≈ $245, etc.) with per-ticker volatility.
3. **Session persistence** — JWT and user info are kept in `localStorage` so sessions survive page refresh.
4. **Single-node deployment** — SQLite is the right fit; multi-node would require PostgreSQL + Redis pub/sub.
5. **Node.js 22+** — required for the built-in `node:sqlite` module (stable in Node 22, no compilation needed).

---

## Future Improvements

- **Real market data** — swap `PriceSimulator` for a Polygon.io or Alpaca WebSocket feed
- **Persistent price history** — store ticks in DB so charts survive page refresh
- **PostgreSQL + Redis** — for horizontal scaling; Redis pub/sub replaces the in-process EventEmitter
- **Rate limiting** — `express-rate-limit` on login and subscription endpoints
- **OTP / email verification** — for production security
- **Price alerts** — user-defined thresholds with browser push notifications
- **Portfolio tracking** — quantity, cost basis, P&L
- **E2E tests** — Playwright for full login → subscribe → live-price → chart flow
- **Dynamic ticker list** — admin-configurable tickers rather than a hardcoded array

---

## Tradeoffs and Design Decisions

### `node:sqlite` (built-in) over `better-sqlite3`

Node.js 22 ships SQLite as a built-in module — zero npm install, zero native compilation (no Visual Studio / Xcode required). The tradeoff is a Node 22+ requirement. `better-sqlite3` has a richer ecosystem and prebuilt binaries for older Node versions, but requires a C++ compiler toolchain which creates CI/CD friction. For a self-contained submission, the built-in is the cleaner choice.

### Jest (backend) vs Vitest (frontend)

Vitest uses Vite as its module bundler/transformer, and Vite's resolver doesn't recognize `node:sqlite` as a built-in (it's not in the Node `builtinModules` list without the `node:` prefix). Jest with `ts-jest` uses Node.js's native module resolution, which handles `node:sqlite` transparently. Each tool is used where it fits best: Jest for the Node.js server, Vitest for the React frontend.

### SQLite vs PostgreSQL

SQLite requires zero infrastructure. The synchronous `node:sqlite` driver is safe in Node.js because SQLite queries execute in microseconds and don't block the event loop meaningfully. The first scaling step would be PostgreSQL + a connection pool.

### WebSocket fan-out in-process

`WsManager` queries the DB for each connected client's subscriptions on every price tick. At small client counts (< ~1000), SQLite is fast enough. At scale, the optimization is to cache `userId → Set<ticker>` in memory and invalidate on subscription change — O(1) instead of O(query). Not premature at this scale.

### JWT in localStorage

Simpler than `httpOnly` cookies and works across tabs. The known trade-off is XSS exposure. In production, `httpOnly` cookies with SameSite=Strict would be more secure.

### `createApp()` factory pattern

`app.ts` exports a factory function rather than a module-level singleton. This lets each test file import a fresh Express app instance, avoiding shared state and port conflicts across test suites.

### Reconnect with exponential backoff

The WS client doubles its delay on each failed reconnect (1 s → 2 s → 4 s → … → 30 s). This prevents thundering-herd reconnects after a server restart without leaving the user disconnected for too long.

### Live chart with rolling history

`useStockFeed` accumulates a rolling window of up to 60 price points per ticker (one per second). The chart uses `recharts` `AreaChart` with `isAnimationActive={false}` on the data series so live updates don't cause visual flicker. The gradient fill changes colour (green/red) to match the current price direction.

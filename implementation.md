# Implementation Notes

Reasoning behind specific technical choices made during development, including alternatives considered.

---

## Authentication: Email-only JWT

**Decision:** Accept email, issue JWT, create user on first login (upsert pattern).

**Why JWT over sessions:** WebSocket handshake doesn't carry cookies reliably without complex configuration. With JWT the frontend sends `{ type: 'authenticate', token }` as the first WS message, and the backend can verify it without a DB round-trip. Sessions would require a shared session store (Redis or DB), adding infrastructure complexity for no gain at this scale.

**Why no password:** The spec says "Login using their email address." I treat email as the identity claim. Adding passwords would require hashing (bcrypt), reset flows, and secure storage — all out of scope.

**JWT secret via env var:** The secret defaults to a dev placeholder. In production, `JWT_SECRET` must be set to a cryptographically random 256-bit value.

---

## Database: `node:sqlite` (Node.js built-in)

**Decision:** SQLite via the `node:sqlite` built-in module (Node.js 22+), synchronous API.

**Why synchronous:** Node.js is single-threaded. The synchronous SQLite driver avoids the overhead of the libuv thread pool and JS promise scheduling for queries that run in microseconds. The caveat is it blocks the event loop — but SQLite queries are so fast this is negligible.

**Why not PostgreSQL:** No infrastructure to spin up. SQLite's WAL mode (`PRAGMA journal_mode = WAL`) gives concurrent readers with a single writer, which is exactly our access pattern (many reads, infrequent writes).

**Why `node:sqlite` over `better-sqlite3`:** The built-in requires no npm install and no native compilation (no Visual Studio / Xcode needed). The tradeoff is a Node 22+ requirement, which is reasonable given Node 22 is the current LTS.

**Migration strategy:** `getDb()` is a singleton that runs `CREATE TABLE IF NOT EXISTS` on first call. Sufficient for a single-instance app; a production system would use a versioned migration framework.

**In-memory DB for tests:** Tests set `DB_PATH=:memory:` before the first `getDb()` call, giving each test run an isolated, ephemeral database with no filesystem side effects.

---

## Real-time: WebSockets over SSE

**Alternatives considered:**

- **Server-Sent Events (SSE):** One-directional (server→client), simple to implement. Rejected because the WS protocol also carries client→server messages (`authenticate`, `ping`), making SSE awkward.
- **Polling:** Simple but wastes bandwidth and introduces up to 1-second latency per poll. Not appropriate for a live feed.
- **Socket.IO:** Adds abstraction (rooms, namespaces), auto-reconnect, fallbacks. Rejected in favour of the raw `ws` library because the feature set isn't needed and Socket.IO adds ~30 KB to the client bundle.

**WS message protocol:** All messages are JSON with a `type` discriminant. Easy to extend with new message types without breaking existing clients.

**Authentication handshake:** The server sends `{ type: 'connected' }` immediately. The client must respond with `{ type: 'authenticate', token }` as its first message. Unauthenticated connections receive an error and are closed, preventing resource exhaustion from idle connections.

---

## Price Simulator Design

**Random walk model:** Each tick applies `delta = (Math.random() * 2 - 1) * volatility * currentPrice`. This is a discrete approximation of Geometric Brownian Motion — prices never go below $0.01, changes are proportional to the current price, and each ticker has its own configurable volatility.

**Why EventEmitter:** The simulator is decoupled from the WS layer. `WsManager` listens to `priceSimulator.on('price', handler)`. This lets the simulator be tested independently with fake timers, and future consumers (e.g., a price history recorder) can subscribe without touching the WS code.

**Singleton vs instance:** `priceSimulator` is exported as a singleton — one source of truth for prices per process. Tests create their own `new PriceSimulator()` instances to avoid cross-test interference.

---

## WebSocket Manager: Per-User Fan-out

**The fan-out loop:**

```text
for each connected authenticated client:
  query DB for that user's subscriptions
  if ticker in subscriptions: send price_update
```

**Performance trade-off:** Querying the DB per client per tick is correct and simple. At scale the optimization is:

1. Cache `userId → Set<ticker>` in `WsManager` memory
2. Invalidate the cache entry on `notifySubscriptionChange(userId)`

This gives O(1) lookup instead of a DB query. Not needed at the scale being demonstrated.

**Why not "rooms" or topics:** A `Map<ticker, Set<WebSocket>>` would give O(1) fan-out instead of O(clients). That is the correct architecture at scale but the DB-query approach is simpler and trivially correct here.

---

## Frontend Architecture

**Context + Hook separation:**

- `AuthContext` owns identity state (user, token) and login/logout.
- `useStockFeed` owns price + subscription state and the WS connection.
- `Dashboard` composes both without knowing about their implementation.

This separation means auth tests don't need a running WS, and WS tests don't need a real auth server.

**`useStockFeed` re-creates WS on token change:** If the user logs out and back in, a new `StockWebSocket` is created with the new token. The `useEffect` cleanup disconnects the old socket.

**Price state as `Map<ticker, StockPrice>`:** Gives O(1) lookup in `StockCard` and makes partial updates simple — only the updated ticker's entry changes, not the whole collection.

**No global state library (Redux/Zustand/Jotai):** Two contexts is sufficient. Adding a global store would be premature for this feature surface.

---

## Error Handling

**Backend:**

- Zod validation on all inputs with specific error messages surfaced to the client
- 401 from JWT middleware on all protected routes
- 409 Conflict for duplicate subscriptions (client handles gracefully)
- Generic 500 handler logs the stack but returns a safe message to the client

**Frontend:**

- WS errors trigger auto-reconnect with exponential backoff (1 s → 2 s → 4 s → … → 30 s)
- REST errors are caught and displayed inline in the component that triggered them
- `ConnectionStatus` component gives the user live visibility into WS state
- `aria-live="polite"` on status indicators for screen-reader accessibility

---

## Testing Strategy

### Test framework split: Jest (backend) vs Vitest (frontend)

The backend uses **Jest + ts-jest + Supertest**. The frontend uses **Vitest + React Testing Library**.

The reason for the split: Vitest uses Vite as its module bundler/transformer. Vite's resolver strips the `node:` prefix from imports and then checks whether the bare name (e.g., `sqlite`) is in Node.js's `builtinModules` list. `node:sqlite` appears in that list _only with_ the prefix — `sqlite` alone does not — so Vite fails to identify it as a built-in and throws "Failed to load url sqlite." This is a known Vite limitation for newer Node.js built-ins.

Jest with `ts-jest` compiles TypeScript via `tsc`'s transformation pipeline and loads modules via Node.js's native `require`, which handles `node:` imports transparently.

Alternatives considered and rejected:

- **Vitest with a custom Vite plugin** (`resolveId` hook): the Vite module runner intercepts imports _after_ its own built-in resolver, so custom plugins fire too late.
- **`pool: 'forks'`**: Vitest still transforms files through Vite before forking workers.
- **Mocking `node:sqlite`**: defeats the purpose of integration tests that hit a real DB.

**Backend tests (Jest + Supertest):**
`createApp()` factory gives each test suite a fresh Express instance. DB is `node:sqlite` in-memory (`DB_PATH=:memory:`), reset between tests. Tests cover the full pipeline: middleware → route → controller → model → DB.

**PriceSimulator unit tests (Jest fake timers):**
`jest.useFakeTimers()` + `jest.advanceTimersByTime(1000)` tests tick behaviour synchronously.

**Frontend component tests (Vitest + React Testing Library):**
Tests render into jsdom. API is mocked with `vi.mock`. Queries use accessibility roles (`getByRole`, `getByLabelText`) — no snapshot tests, no Enzyme.

**What's not tested:**

- WebSocket end-to-end integration (would need a real server + WS client)
- Full auth → WS → price-update flow (covered manually)
- Docker build (infrastructure concern)

An E2E layer with **Playwright** would be the right addition for CI coverage of the full user journey.

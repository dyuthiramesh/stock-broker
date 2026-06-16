import request from 'supertest';
import { createApp } from '../src/app';
import { closeDb, getDb } from '../src/db/database';

const app = createApp();

async function getToken(): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });
  return res.body.token;
}

beforeEach(() => {
  closeDb();
  const db = getDb();
  db.exec('DELETE FROM subscriptions; DELETE FROM users;');
});

afterAll(() => {
  closeDb();
});

describe('GET /api/stocks', () => {
  it('returns all stock prices', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/api/stocks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.prices).toHaveLength(5);
    expect(res.body.tickers).toContain('GOOG');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/stocks');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/stocks/:ticker', () => {
  it('returns price for a valid ticker', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/api/stocks/NVDA')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.price.ticker).toBe('NVDA');
    expect(res.body.price.price).toBeGreaterThan(0);
  });

  it('returns 404 for unknown ticker', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/api/stocks/AAPL')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

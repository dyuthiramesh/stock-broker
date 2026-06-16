import request from 'supertest';
import { createApp } from '../src/app';
import { closeDb, getDb } from '../src/db/database';

const app = createApp();

async function getToken(email = 'user@test.com'): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email });
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

describe('GET /api/subscriptions', () => {
  it('returns empty subscriptions for new user', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.subscriptions).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/subscriptions', () => {
  it('subscribes to a valid ticker', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'GOOG' });

    expect(res.status).toBe(201);
    expect(res.body.subscription).toBe('GOOG');
  });

  it('accepts lowercase ticker', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'tsla' });

    expect(res.status).toBe(201);
    expect(res.body.subscription).toBe('TSLA');
  });

  it('rejects duplicate subscription', async () => {
    const token = await getToken();
    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AMZN' });

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AMZN' });

    expect(res.status).toBe(409);
  });

  it('rejects unsupported ticker', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL' });

    expect(res.status).toBe(400);
  });

  it('different users have independent subscriptions', async () => {
    const token1 = await getToken('alice@test.com');
    const token2 = await getToken('bob@test.com');

    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token1}`)
      .send({ ticker: 'GOOG' });

    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token2}`)
      .send({ ticker: 'TSLA' });

    const res1 = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${token1}`);
    const res2 = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${token2}`);

    expect(res1.body.subscriptions).toEqual(['GOOG']);
    expect(res2.body.subscriptions).toEqual(['TSLA']);
  });
});

describe('DELETE /api/subscriptions/:ticker', () => {
  it('unsubscribes from a subscribed ticker', async () => {
    const token = await getToken();
    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'META' });

    const res = await request(app)
      .delete('/api/subscriptions/META')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const list = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.subscriptions).toEqual([]);
  });

  it('returns 404 when not subscribed', async () => {
    const token = await getToken();
    const res = await request(app)
      .delete('/api/subscriptions/NVDA')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

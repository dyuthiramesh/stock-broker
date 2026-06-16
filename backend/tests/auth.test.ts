import request from 'supertest';
import { createApp } from '../src/app';
import { closeDb, getDb } from '../src/db/database';

const app = createApp();

beforeEach(() => {
  closeDb();
  const db = getDb();
  db.exec('DELETE FROM subscriptions; DELETE FROM users;');
});

afterAll(() => {
  closeDb();
});

describe('POST /api/auth/login', () => {
  it('returns a token and user for valid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('normalizes email to lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Test@Example.COM' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns same user on repeated login', async () => {
    const res1 = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });
    const res2 = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });

    expect(res1.body.user.id).toBe(res2.body.user.id);
  });

  it('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

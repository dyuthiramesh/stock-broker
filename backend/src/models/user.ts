import { getDb } from '../db/database';

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export const UserModel = {
  findByEmail(email: string): User | undefined {
    const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as unknown as User | undefined;
  },

  findById(id: number): User | undefined {
    const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as unknown as User | undefined;
  },

  create(email: string): User {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO users (email) VALUES (?)');
    const result = stmt.run(email);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User;
  },

  findOrCreate(email: string): User {
    const existing = UserModel.findByEmail(email);
    if (existing) return existing;
    return UserModel.create(email);
  },
};

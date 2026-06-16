// Use in-memory SQLite for tests
process.env.DB_PATH = ':memory:';
process.env.DB_DIR = '.';
process.env.JWT_SECRET = 'test-secret';

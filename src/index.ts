import { createApp } from './app';
import { initDb } from './db/database';
import { PORT } from './config/env';

const db = initDb();
console.log('[DB] SQLite database initialized');

const app = createApp();

app.listen(PORT, () => {
  console.log(`[Server] Finance Dashboard API running on http://localhost:${PORT}`);
  console.log(`[Docs]   Swagger UI available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('[DB] Database connection closed.');
  process.exit(0);
});
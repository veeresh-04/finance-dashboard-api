import { createApp } from './app';
import { initDb } from './db/database';
import { PORT } from './config/env';

async function bootstrap(): Promise<void> {
  const db = await initDb();
  console.log('[DB] Postgres database initialized');

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[Server] Finance Dashboard API running on http://localhost:${PORT}`);
    console.log(`[Docs]   Swagger UI available at http://localhost:${PORT}/api-docs`);
  });

  process.on('SIGINT', async () => {
    await db.end();
    console.log('[DB] Database connection closed.');
    process.exit(0);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('[Startup Error]', error);
  process.exit(1);
});

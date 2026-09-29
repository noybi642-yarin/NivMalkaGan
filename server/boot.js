import { openDb } from './db.js';
import { createApp } from './app.js';
import { seed } from './seed.js';

/** Opens the database, seeds demo data if asked to, and builds the API app. Shared by the Node server and Vercel. */
export function bootApp({ dbPath, production, demo, trustProxy = 'loopback' }) {
  const db = openDb(dbPath);
  if (demo && !db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
    seed(db);
    console.log('Seeded demo data');
  }
  return createApp(db, { secureCookies: production, demo, trustProxy });
}

/** Demo mode shows one-tap demo logins and seeds an empty database. Off in production unless asked for. */
export const demoFromEnv = (production) =>
  process.env.DEMO_MODE ? process.env.DEMO_MODE === 'true' : !production;

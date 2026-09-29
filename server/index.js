import path from 'node:path';
import express from 'express';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { seed } from './seed.js';

const dev = process.argv.includes('--dev');
const production = process.env.NODE_ENV === 'production';
// Demo mode shows one-tap demo logins and seeds an empty database. Off in production unless asked for.
const demo = process.env.DEMO_MODE ? process.env.DEMO_MODE === 'true' : !production;
const port = Number(process.env.PORT) || 3000;

const db = openDb();
if (demo && !db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
  seed(db);
  console.log('Seeded demo data');
}

const app = createApp(db, { secureCookies: production, demo });

if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = path.resolve('client/dist');
  app.use((_req, res, next) => {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'",
    );
    next();
  });
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(port, () => console.log(`היום בגן → http://localhost:${port}`));

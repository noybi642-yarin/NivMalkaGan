import path from 'node:path';
import express from 'express';
import { bootApp, demoFromEnv } from './boot.js';

const dev = process.argv.includes('--dev');
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

const app = bootApp({ production, demo: demoFromEnv(production) });

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

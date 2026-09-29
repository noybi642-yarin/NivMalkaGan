// Vercel entry point: the whole /api is one function running the same Express app as `npm start`.
// The React client is served as static files from client/dist (see vercel.json).
//
// Vercel functions only have a temporary /tmp filesystem, so the SQLite database lives there and
// is recreated when an instance starts — with DEMO_MODE=true it is re-seeded with the demo data.
import { bootApp, demoFromEnv } from '../server/boot.js';

export default bootApp({
  dbPath: process.env.DB_PATH || '/tmp/gan.db',
  production: true,
  demo: demoFromEnv(true),
  // Vercel's edge sets X-Forwarded-For; trust it so rate limiting sees the real client IP.
  trustProxy: true,
});

import express from 'express';
import {
  COOKIE,
  createSession,
  destroySession,
  loadUser,
  loginLimiter,
  requireRole,
  normalizePhone,
  readCookie,
  requireCsrfHeader,
  sessionCookie,
  verifyPassword,
} from './auth.js';
import { HttpError, todayIL } from './domain.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed.js';
import { staffRoutes } from './routes/staff.js';
import { parentRoutes } from './routes/parent.js';
import { kindergartenInfo, vacationSchedule } from './kindergarten.js';

/** Builds the API. Static/client serving is added by server/index.js. */
export function createApp(db, { secureCookies = false, demo = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
  });

  const api = express.Router();
  api.use(express.json({ limit: '20kb' }));
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(requireCsrfHeader);
  api.use(loadUser(db));

  api.get('/config', (_req, res) => {
    const config = { demo, today: todayIL() };
    if (demo) {
      config.demoPassword = DEMO_PASSWORD;
      config.demoAccounts = Object.entries(DEMO_ACCOUNTS).map(([role, a]) => ({ role, ...a }));
    }
    res.json(config);
  });

  const limiter = loginLimiter();
  api.post('/auth/login', (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    // The login screen has separate staff / parent entrances; an account only opens its own.
    const role = req.body?.role;
    if (role !== undefined && !['staff', 'parent'].includes(role)) throw new HttpError(400, 'invalid role');
    const key = `${req.ip}|${phone}`;
    if (limiter.blocked(key)) throw new HttpError(429, 'too many attempts');
    const user = phone ? db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) : null;
    // Always run the hash so timing does not reveal whether the phone exists.
    const ok = verifyPassword(password, user?.password_hash) && Boolean(user) && (!role || user.role === role);
    if (!ok) {
      limiter.fail(key);
      throw new HttpError(401, 'wrong credentials');
    }
    limiter.clear(key);
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    res.set('Set-Cookie', sessionCookie(createSession(db, user.id), { secure: secureCookies }));
    res.json({ user: { id: user.id, role: user.role, name: user.name } });
  });

  api.post('/auth/logout', (req, res) => {
    destroySession(db, readCookie(req, COOKIE));
    res.set('Set-Cookie', sessionCookie('', { secure: secureCookies }));
    res.json({ ok: true });
  });

  api.get('/me', (req, res) => {
    if (!req.user) throw new HttpError(401, 'not signed in');
    const { id, role, name } = req.user;
    res.json({ user: { id, role, name } });
  });

  api.use('/staff', staffRoutes(db));
  api.use('/parent', parentRoutes(db));

  // Kindergarten-wide information, readable by both staff and parents of this kindergarten only.
  const anyone = requireRole('staff', 'parent');
  api.get('/kindergarten', anyone, (req, res) => res.json({ kindergarten: kindergartenInfo(db, req.user.kindergartenId) }));
  api.get('/vacations', anyone, (req, res) => res.json(vacationSchedule(db, req.user.kindergartenId)));

  api.use((_req, _res, next) => next(new HttpError(404, 'not found')));
  api.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'server error' : err.message });
  });

  app.use('/api', api);
  return app;
}

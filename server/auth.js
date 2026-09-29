import crypto from 'node:crypto';
import { HttpError } from './domain.js';

export const COOKIE = 'gan_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

// Used when the phone number is unknown so that response time does not reveal which accounts exist.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

export function verifyPassword(password, stored = DUMMY_HASH) {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Usernames are case-insensitive and ignore surrounding spaces. */
export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 64) : '';
}

/*
 * Sessions are signed tokens (HMAC-SHA256): "<userId>.<expiresAt>.<nonce>.<signature>".
 * Any server instance holding SESSION_SECRET can verify one without shared storage — needed on
 * Vercel, where several function instances run side by side with separate databases.
 * Logging out records the token in revoked_sessions so it stops working.
 */
let fallbackSecret;
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!fallbackSecret) {
    if (process.env.VERCEL && process.env.DEMO_MODE === 'true') {
      // Public demo only: every demo account shares the published password, so a key derived from the
      // deployment protects nothing extra — but it is identical on every instance of that deployment.
      const deployment = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || 'demo';
      fallbackSecret = sha256(`hayom-bagan-demo:${deployment}`);
    } else {
      // A single local process: a random key per start is fine (sessions end on restart).
      if (process.env.VERCEL) console.warn('SESSION_SECRET is not set; sessions will not survive across instances');
      fallbackSecret = crypto.randomBytes(32).toString('hex');
    }
  }
  return fallbackSecret;
}

const sign = (payload) => crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');

export function createSession(_db, userId) {
  const payload = `${userId}.${Date.now() + SESSION_TTL_MS}.${crypto.randomBytes(12).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns { userId, expiresAt } for a genuine, unexpired token, otherwise null. */
export function verifySessionToken(token) {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join('.');
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(parts[3]);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  const userId = Number(parts[0]);
  const expiresAt = Number(parts[1]);
  if (!Number.isInteger(userId) || !(expiresAt > Date.now())) return null;
  return { userId, expiresAt };
}

export function destroySession(db, token) {
  const session = verifySessionToken(token);
  if (!session) return;
  db.prepare('DELETE FROM revoked_sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT OR IGNORE INTO revoked_sessions (token_hash, expires_at) VALUES (?, ?)').run(
    sha256(token),
    session.expiresAt,
  );
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function sessionCookie(token, { secure }) {
  const attrs = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? SESSION_TTL_MS / 1000 : 0}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/** Attaches req.user (or null) from the session cookie. */
export function loadUser(db) {
  const userStmt = db.prepare('SELECT id, role, name, kindergarten_id AS kindergartenId FROM users WHERE id = ?');
  const revokedStmt = db.prepare('SELECT 1 FROM revoked_sessions WHERE token_hash = ?');
  return (req, _res, next) => {
    const token = readCookie(req, COOKIE);
    const session = token ? verifySessionToken(token) : null;
    req.user = session && !revokedStmt.get(sha256(token)) ? userStmt.get(session.userId) ?? null : null;
    next();
  };
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'not signed in'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'forbidden'));
    next();
  };
}

/**
 * CSRF defence in depth on top of SameSite=Lax: state-changing requests must carry a custom
 * header, which a cross-site form or image cannot set without a CORS preflight (which we never allow).
 */
export function requireCsrfHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'gan') return next(new HttpError(403, 'missing request header'));
  next();
}

/** Tiny in-memory limiter for failed login attempts (successful logins are not counted). */
export function loginLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map();
  const current = (key) => {
    const entry = failures.get(key);
    if (entry && entry.reset < Date.now()) failures.delete(key);
    return failures.get(key);
  };
  return {
    blocked: (key) => (current(key)?.count ?? 0) >= max,
    fail: (key) => {
      const entry = current(key) ?? { count: 0, reset: Date.now() + windowMs };
      entry.count += 1;
      failures.set(key, entry);
    },
    clear: (key) => failures.delete(key),
  };
}

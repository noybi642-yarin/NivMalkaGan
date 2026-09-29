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

/** Israeli mobile numbers in any common format → 05XXXXXXXX. */
export function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) digits = `0${digits.slice(3)}`;
  return digits;
}

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    Date.now() + SESSION_TTL_MS,
  );
  return token;
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
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
  const stmt = db.prepare(`
    SELECT u.id, u.role, u.name, u.kindergarten_id AS kindergartenId
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`);
  return (req, _res, next) => {
    const token = readCookie(req, COOKIE);
    req.user = token ? stmt.get(sha256(token), Date.now()) ?? null : null;
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

/** Tiny in-memory fixed-window limiter for login attempts. */
export function loginLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

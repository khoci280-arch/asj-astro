import crypto from 'crypto';
import { env } from './env';
// session.js — token sesi bertanda tangan (HMAC-SHA256).
//
// Pengganti "createSession" di auth.ts asli. Token { role, wa?, name? }
// ditandatangani dengan secret dari env; semua aksi admin/kandidat
// memvalidasinya kembali. Tidak ada penyimpanan status server-side.

/** @typedef {{ role: string, wa?: string, name?: string, kind?: string }} SessionPayload */

/** Memoized secret — computed once per process lifetime. */
let _secret: string | null = null;

/** @returns {string} */
function secret() {
  if (_secret) return _secret;

  const s =
    env('SESSION_SECRET') ||
    env('ADMIN_PASSWORD') ||
    env('ASJ_ADMIN_PASSWORD') ||
    env('ADMIN_MASTER_PIN') ||
    env('PIN_KHOCI') ||
    '';

  if (s) {
    _secret = s;
    return _secret;
  }

  // Production: throw — no forged tokens allowed.
  const isProd =
    process.env.NETLIFY === 'true' ||
    process.env.CONTEXT === 'production' ||
    process.env.NODE_ENV === 'production';

  if (isProd) {
    throw new Error(
      'SESSION_SECRET (or ADMIN_PASSWORD / ADMIN_MASTER_PIN) is not set. ' +
      'Token signing is impossible — refusing to start with a guessable secret.'
    );
  }

  // Local dev fallback: use a random ephemeral secret for the process lifetime
  // so tokens from a previous dev session don't carry over.
  console.warn(
    '[session] ⚠️  No SESSION_SECRET set — using random ephemeral secret. ' +
    'Admin tokens will NOT survive a server restart. Set SESSION_SECRET in .env.local.'
  );
  _secret = crypto.randomBytes(32).toString('hex');
  return _secret;
}

/** @param {SessionPayload} payload @returns {string} */
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + sig;
}

/** @param {string} token @returns {SessionPayload | null} */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expect = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export { signToken, verifyToken };

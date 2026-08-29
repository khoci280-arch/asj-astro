import crypto from 'crypto';
import { env } from './env';
// session.js — token sesi bertanda tangan (HMAC-SHA256).
//
// Pengganti "createSession" di auth.ts asli. Token { role, wa?, name? }
// ditandatangani dengan secret dari env; semua aksi admin/kandidat
// memvalidasinya kembali. Tidak ada penyimpanan status server-side.

/** @typedef {{ role: string, wa?: string, name?: string, kind?: string }} SessionPayload */

/** @returns {string} */
function secret() {
  return (
    env('SESSION_SECRET') ||
    env('ADMIN_PASSWORD') ||
    env('ASJ_ADMIN_PASSWORD') ||
    env('ADMIN_MASTER_PIN') ||
    env('PIN_KHOCI') ||
    // Fallback lokal — DI PRODUKSI pastikan SESSION_SECRET / ADMIN_* di-set
    // supaya token tidak bisa dipalsukan dengan nilai yang ada di repo.
    'asj-portal-local-secret'
  );
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

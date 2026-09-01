/**
 * kernel/request-helpers.ts — Shared request utilities
 *
 * Extracted from netlify-wrapper.ts and netlify-wrapper-surface.ts to
 * eliminate duplication of CORS, client IP extraction, and session token
 * parsing. Both wrappers import from here instead of defining their own copies.
 */

import { env } from '../env';

// ── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  env('APP_ORIGIN') || '',
  env('SITE_URL') || '',
  'https://asjportal.netlify.app',
  'http://localhost:4321',
].filter(Boolean);

export function getCorsOrigin(origin?: string): string {
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] || '*';
}

/** Standard CORS headers for all API responses. */
export function corsHeaders(requestOrigin: string): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  };
}

// ── Client IP ───────────────────────────────────────────────────────────────

/** Extract client IP from standard proxy/Netlify headers. */
export function clientIp(event: { headers?: Record<string, string> }): string | null {
  const h = (event && event.headers) || {};
  const fwd = h['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return h['client-ip'] || h['x-real-ip'] || null;
}

// ── Session Token ───────────────────────────────────────────────────────────

/**
 * Extract session token from request.
 *
 * Priority: body.sessionToken → header Authorization → query string.
 */
export function sessionTokenFrom(
  event: { headers?: Record<string, string>; queryStringParameters?: Record<string, string> },
  body: Record<string, unknown>,
): string | undefined {
  if (body && body.sessionToken) return String(body.sessionToken);
  const h = (event && event.headers) || {};
  const auth = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(auth).trim());
  if (m) return m[1];
  const q = (event && event.queryStringParameters) || {};
  return q.sessionToken || undefined;
}

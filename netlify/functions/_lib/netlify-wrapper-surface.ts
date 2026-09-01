/**
 * netlify-wrapper-surface.ts — Factory for surface-specific Netlify functions
 *
 * Instead of one monolithic bridge-links.js handling all 82+ actions,
 * each surface gets its own entry point. This enables:
 *   - Concurrent scaling: Netlify routes auth requests to auth.js,
 *     public requests to get-app-data.js, etc.
 *   - Smaller cold starts: each function only loads its surface module.
 *   - Independent retries: a failing AI surface doesn't block auth.
 *
 * Usage in netlify/functions/auth.js:
 *   const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
 *   exports.handler = makeSurfaceHandler(['checkAdminMaster', 'loginKandidat', ...]);
 */

import { log, runWithContext } from './kernel/log';
import { metrics } from './kernel/metrics';

// ── Shared helpers (duplicated from netlify-wrapper.ts for independence) ─────

function clientIp(event: { headers?: Record<string, string> }): string | null {
  const h = (event && event.headers) || {};
  const fwd = h['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return h['client-ip'] || h['x-real-ip'] || null;
}

function sessionTokenFrom(event: { headers?: Record<string, string>; queryStringParameters?: Record<string, string> }, body: Record<string, unknown>): string | undefined {
  if (body && body.sessionToken) return body.sessionToken;
  const h = (event && event.headers) || {};
  const auth = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(auth).trim());
  if (m) return m[1];
  const q = (event && event.queryStringParameters) || {};
  return q.sessionToken || undefined;
}

// ── Surface handler factory ─────────────────────────────────────────────────

/**
 * Create a Netlify handler that only accepts actions from a specific surface.
 * Unknown actions return 404 instead of falling through to the monolith.
 *
 * @param allowedActions - The action names this surface handles.
 *                         Used for fast rejection before dynamic import.
 */
export function makeSurfaceHandler(allowedActions: string[]) {
  const allowedSet = new Set(allowedActions);

  return async (event: { body?: string; headers?: Record<string, string>; queryStringParameters?: Record<string, string> }) => {
    let body: Record<string, any> = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch { /* body non-JSON */ }

    if (!body.action) {
      const q = (event && event.queryStringParameters) || {};
      body.action = body.action || q.action || undefined;
      if (body.action) {
        body.payload = body.payload || body.args || q.payload || undefined;
      }
    }

    // Fast rejection: this surface doesn't handle this action
    if (body.action && !allowedSet.has(body.action) && body.action !== 'ping') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          success: false,
          message: `Action '${body.action}' not handled by this surface.`,
        }),
      };
    }

    // Idempotency key
    const idempotencyKey = (event && event.headers)
      ? (event.headers['idempotency-key'] || event.headers['Idempotency-Key'] || undefined)
      : undefined;
    if (idempotencyKey) (globalThis as Record<string, unknown>).__idempotencyKey = String(idempotencyKey);
    else delete (globalThis as Record<string, unknown>).__idempotencyKey;

    // Distributed tracing
    const traceparent = (event && event.headers)
      ? (event.headers['traceparent'] || event.headers['Traceparent'] || undefined)
      : undefined;
    const requestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    (globalThis as Record<string, unknown>).__requestId = requestId;
    (globalThis as Record<string, unknown>).__traceparent = traceparent;

    // Import the lazy surface loader
    const { getSurfaceHandler } = await import('../surfaces/index');
    const { handleAction } = await import('./handlers');

    let out: unknown;
    try {
      out = await runWithContext({ requestId, action: body.action }, () =>
        handleAction(body.action, body.payload || body.args, sessionTokenFrom(event, body), {
          ip: clientIp(event),
        }),
      );
    } catch (e: unknown) {
      out = { success: false, message: 'Error internal: ' + (e instanceof Error ? e.message : String(e)) };
    }

    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    };

    if (out && typeof out === 'object' && typeof out.statusCode === 'number' && out.body !== undefined) {
      return { statusCode: out.statusCode, headers: baseHeaders, body: String(out.body) };
    }
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(out) };
  };
}

export { makeSurfaceHandler as makeHandler };

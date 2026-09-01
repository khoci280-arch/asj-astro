import { handleAction } from './handlers';
import { runWithContext } from './kernel/log';
// netlify-wrapper.js — factory handler Netlify standar.
//
// Setiap file di netlify/functions/<nama>.js hanyalah:
//   exports.handler = makeHandler();
// dan seluruh logika dipusatkan di _lib/handlers.js (dispatch per action).

// Ambil IP klien dari header standar proxy/Netlify untuk rate limit (M3).
function clientIp(event) {
  const h = (event && event.headers) || {};
  const fwd = h['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return h['client-ip'] || h['x-real-ip'] || null;
}

/**
 * Ambil session token dari request.
 *
 * Secara historis backend HANYA membaca `body.sessionToken`. Padahal banyak
 * pemanggil di src/ mengirim token lewat header `Authorization: Bearer <token>`
 * (lihat apiClient.ts dan puluhan fetch mentah di komponen admin). Akibatnya
 * token itu diabaikan dan handler yang dijaga requireAdmin/requireRole menolak
 * permintaan yang sebenarnya sah.
 *
 * Urutan prioritas: body.sessionToken → header Authorization → query string.
 */
function sessionTokenFrom(event, body) {
  if (body && body.sessionToken) return body.sessionToken;
  const h = (event && event.headers) || {};
  const auth = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(auth).trim());
  if (m) return m[1];
  const q = (event && event.queryStringParameters) || {};
  return q.sessionToken || undefined;
}

function makeHandler() {
  return async (event) => {
    let body: Record<string, any> = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      /* body non-JSON -> action kosong */
    }
    // Keep-alive via GET (curl ?action=ping) — action boleh datang dari query
    // string kalau body kosong (mis. GitHub Actions keep-alive).
    if (!body.action) {
      const q = (event && event.queryStringParameters) || {};
      body.action = body.action || q.action || undefined;
      if (body.action) {
        body.payload = body.payload || body.args || q.payload || undefined;
      }
    }
    // Phase 5: extract Idempotency-Key header for mutation dedup
    const idempotencyKey = (event && event.headers)
      ? (event.headers['idempotency-key'] || event.headers['Idempotency-Key'] || undefined)
      : undefined;
    if (idempotencyKey) (globalThis as any).__idempotencyKey = String(idempotencyKey);
    else delete (globalThis as any).__idempotencyKey;

    // Phase 7: extract traceparent for distributed tracing (§10.3)
    const traceparent = (event && event.headers)
      ? (event.headers['traceparent'] || event.headers['Traceparent'] || undefined)
      : undefined;
    const requestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    (globalThis as any).__requestId = requestId;
    (globalThis as any).__traceparent = traceparent;

    let out;
    try {
      out = await runWithContext({ requestId, action: body.action }, () =>
        handleAction(body.action, body.payload || body.args, sessionTokenFrom(event, body), {
          ip: clientIp(event),
        }),
      );
    } catch (e) {
      out = { success: false, message: 'Error internal: ' + e.message };
    }
    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    };
    // Respons RAW dari handler (action 'ping': { statusCode: 200, body: 'pong' })
    // diteruskan apa adanya — tanpa JSON.stringify, tanpa bungkus tambahan.
    if (
      out &&
      typeof out === 'object' &&
      typeof out.statusCode === 'number' &&
      out.body !== undefined
    ) {
      return {
        statusCode: out.statusCode,
        headers: baseHeaders,
        body: String(out.body),
      };
    }
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify(out),
    };
  };
}

export { makeHandler };

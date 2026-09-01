import { randomUUID } from 'node:crypto';
import { handleAction } from './handlers';
import { runWithContext } from './kernel/log';
import { clientIp, sessionTokenFrom, corsHeaders } from './kernel/request-helpers';
// netlify-wrapper.js — factory handler Netlify standar.
//
// Setiap file di netlify/functions/<nama>.js hanyalah:
//   exports.handler = makeHandler();
// dan seluruh logika dipusatkan di _lib/handlers.js (dispatch per action).

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

    // Phase 7: extract traceparent for distributed tracing (§10.3)
    const traceparent = (event && event.headers)
      ? (event.headers['traceparent'] || event.headers['Traceparent'] || undefined)
      : undefined;
    const requestId = randomUUID();

    let out;
    try {
      out = await runWithContext({ requestId, action: body.action, idempotencyKey, traceparent }, () =>
        handleAction(body.action, body.payload || body.args, sessionTokenFrom(event, body), {
          ip: clientIp(event),
        }),
      );
    } catch (e) {
      out = { success: false, message: 'Error internal: ' + e.message };
    }
    const requestOrigin = (event && event.headers)
      ? (event.headers.origin || event.headers.Origin || '')
      : '';
    const baseHeaders = corsHeaders(requestOrigin);
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

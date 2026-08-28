import { handleAction } from './handlers';
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
        body.payload = body.payload || q.payload || undefined;
      }
    }
    let out;
    try {
      out = await handleAction(body.action, body.payload, body.sessionToken, {
        ip: clientIp(event),
      });
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

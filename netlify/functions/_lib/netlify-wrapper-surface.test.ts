import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeSurfaceHandler, outcomeStatusCode } from './netlify-wrapper-surface';

// Unit: the outcome -> status precedence policy (single owner of the mapping
// table stays in kernel/errors.ts codeToStatus; this pins the wrapper policy).
describe('outcomeStatusCode - wrapper error-status precedence', () => {
  it('rateLimited wins regardless of code/message', () => {
    expect(outcomeStatusCode({ success: false, rateLimited: true, retryAfter: 30 })).toBe(429);
    expect(outcomeStatusCode({ success: false, code: 'VALIDATION_FAILED', rateLimited: true })).toBe(429);
  });

  it('AppError-serialized rejections map by code (400/404/429/5xx), not blanket 200', () => {
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'VALIDATION_FAILED' })).toBe(400);
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'NOT_FOUND' })).toBe(404);
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'RATE_LIMITED' })).toBe(429);
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'INTERNAL_ERROR' })).toBe(500);
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'SERVICE_UNAVAILABLE' })).toBe(503);
    expect(outcomeStatusCode({ success: false, error: 'x', code: 'WHATEVER' })).toBe(500);
  });

  it('legacy message-only failures keep 400; success and empty stay 200', () => {
    expect(outcomeStatusCode({ success: false, message: 'Fungsi belum diimplementasi' })).toBe(400);
    expect(outcomeStatusCode({ success: true, status: 'not_found' })).toBe(200);
    expect(outcomeStatusCode(undefined)).toBe(200);
    expect(outcomeStatusCode(null)).toBe(200);
  });
});

// Integration: real surface chain - allow-list extracted verbatim from the
// shipped ai-chat.js entry, real wrapper -> dispatcher -> registry -> kernel.
const src = readFileSync(join(__dirname, '..', 'ai-chat.js'), 'utf8');
const m = src.match(/makeSurfaceHandler\(\[\s*([\s\S]*?)\s*\]\)/);
if (!m) throw new Error('allow-list not found in ai-chat.js');
const allowed = m[1].split(',').map((x: string) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
const handler = makeSurfaceHandler(allowed);

describe('surface wrapper - AppError rejections carry their HTTP status (regression)', () => {
  it('getJobStatus with an empty payload: VALIDATION_FAILED arrives as HTTP 400, not 200', async () => {
    const res = await handler({ body: JSON.stringify({ action: 'getJobStatus', payload: [] }) });
    expect(res.statusCode).toBe(400);
    const out = JSON.parse(res.body);
    expect(out.success).toBe(false);
    expect(out.code).toBe('VALIDATION_FAILED');
  });

  it('unknown actions still 404 on this surface (allow-list intact)', async () => {
    const res = await handler({ body: JSON.stringify({ action: 'definitelyNotAnAction', payload: [] }) });
    expect(res.statusCode).toBe(404);
  });
});

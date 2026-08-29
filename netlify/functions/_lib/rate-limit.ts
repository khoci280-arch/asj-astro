// rate-limit.js — rate limiter in-memory (satu instance function/process).
//
// Implementasi paling sederhana tanpa infra baru (sesuai REVIEW.md M3):
//   Map<key, { count, fails, resetAt, lockUntil }> dengan window bergulir.
// Cukup untuk satu instance Netlify function / proses preview; kalau butuh
// akurat lintas instance, pindahkan ke Supabase/Redis.
//
// API:
//   check(key, { limit, windowMs, lockoutAfter, lockoutMs })
//     → { ok: true } atau { ok: false, retryAfter, locked }
//   fail(key, { lockoutAfter, lockoutMs }) — catat kegagalan (mis. PIN salah);
//     setelah `lockoutAfter` kegagalan dalam window → lockout `lockoutMs`.

/** @typedef {{ count: number, fails: number, resetAt: number, lockUntil: number }} Bucket */
/** @typedef {{ limit?: number, windowMs?: number, lockoutAfter?: number, lockoutMs?: number }} RateLimitOpts */
/** @typedef {{ ok: true, retryAfter?: undefined, locked?: undefined } | { ok: false, retryAfter: number, locked?: boolean }} RateLimitResult */

/** @type {Map<string, Bucket>} */
const buckets = new Map();
const MAX_BUCKETS = 20000;

/** @param {number} now */
function prune(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now && b.lockUntil < now) buckets.delete(k);
  }
}

/** @param {string} key @param {number} now @returns {Bucket} */
function getBucket(key, now) {
  let b = buckets.get(key);
  if (!b) {
    b = { count: 0, fails: 0, resetAt: now, lockUntil: 0 };
    buckets.set(key, b);
    prune(now);
  }
  return b;
}

/** @param {string} key @param {RateLimitOpts} opts @returns {RateLimitResult} */
function check(key, opts) {
  const now = Date.now();
  const limit = opts.limit || 5;
  const windowMs = opts.windowMs || 60000;
  const b = getBucket(key, now);

  if (b.lockUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockUntil - now) / 1000), locked: true };
  }
  if (now >= b.resetAt) {
    b.resetAt = now + windowMs;
    b.count = 0;
    b.fails = 0;
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true };
}

/** @param {string} key @param {RateLimitOpts} opts @returns {void} */
function fail(key, opts) {
  const now = Date.now();
  const windowMs = opts.windowMs || 60000;
  const lockoutAfter = opts.lockoutAfter || 0;
  const lockoutMs = opts.lockoutMs || 0;
  const b = getBucket(key, now);
  if (now >= b.resetAt) {
    b.resetAt = now + windowMs;
    b.count = 0;
    b.fails = 0;
  }
  b.fails += 1;
  if (lockoutAfter > 0 && b.fails >= lockoutAfter) {
    b.lockUntil = now + lockoutMs;
    b.fails = 0;
  }
}

export { check, fail };

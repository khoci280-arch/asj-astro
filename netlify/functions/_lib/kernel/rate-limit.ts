/**
 * kernel/rate-limit.ts — Postgres-backed rate limiter (shared across instances)
 *
 * WHY THIS EXISTS
 * ---------------
 * The old rate-limit.ts used an in-memory Map. Netlify runs many concurrent
 * instances, each with its own Map — so the rate limiter was trivially
 * bypassable by distributing requests across instances.
 *
 * This module stores counters in Supabase (PostgREST), which is shared state.
 * It falls back to in-memory if the DB is unavailable (degraded but not broken).
 *
 * API (drop-in replacement for old rate-limit.ts):
 *   check(key, { limit, windowMs, lockoutAfter, lockoutMs })
 *     → { ok: true } | { ok: false, retryAfter, locked }
 *   fail(key, { lockoutAfter, lockoutMs })
 *     → void
 *
 * PERFORMANCE:
 *   One PostgREST read + conditional upsert per check. At 39ms RTT, this adds
 *   ~40ms to the request. Acceptable because:
 *     1. Rate limiting is on the hot path but not latency-critical
 *     2. The alternative (bypassable limiter) is worse than +40ms
 *     3. We can add a per-request L1 cache later (Phase 4)
 */

import { supabaseJson } from '../db/client';
import { log } from './log';

interface RateLimitOpts {
  limit?: number;
  windowMs?: number;
  lockoutAfter?: number;
  lockoutMs?: number;
}

type RateLimitResult =
  | { ok: true; retryAfter?: undefined; locked?: undefined }
  | { ok: false; retryAfter: number; locked?: boolean };

interface CounterRow {
  bucket: string;
  window_start: string;
  count: number;
  fails: number;
  locked_until: string | null;
}

const TABLE = 'rate_counters';

/**
 * Read current counter from Postgres. Returns null if not found or on error.
 */
async function readCounter(bucket: string): Promise<CounterRow | null> {
  try {
    const rows = await supabaseJson('GET', TABLE, {
      query: {
        select: '*',
        bucket: 'eq.' + bucket,
        limit: '1',
      },
    });
    if (Array.isArray(rows) && rows.length > 0) return rows[0] as CounterRow;
    return null;
  } catch {
    return null;
  }
}

/**
 * Upsert counter in Postgres. Uses PUT (upsert) with on_conflict.
 */
async function upsertCounter(row: CounterRow): Promise<boolean> {
  try {
    await supabaseJson('POST', TABLE, {
      query: { on_conflict: 'bucket' },
      body: row,
      headers: { Prefer: 'resolution=merge-duplicates' },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check rate limit for a key. Returns { ok: true } or { ok: false, retryAfter }.
 *
 * Uses Postgres for shared state, with in-memory fallback if DB is down.
 */
export async function check(
  key: string,
  opts: RateLimitOpts = {},
): Promise<RateLimitResult> {
  const limit = opts.limit ?? 5;
  const windowMs = opts.windowMs ?? 60_000;
  const lockoutMs = opts.lockoutMs ?? 0;
  const now = Date.now();
  const windowStart = new Date(now).toISOString();

  // Try Postgres first
  const row = await readCounter(key);

  if (!row) {
    // First request in this window — create counter
    const created = await upsertCounter({
      bucket: key,
      window_start: windowStart,
      count: 1,
      fails: 0,
      locked_until: null,
    });
    if (!created) return memoryCheck(key, opts); // DB failed, fallback
    return { ok: true };
  }

  // Check lockout
  if (row.locked_until) {
    const lockExpiry = new Date(row.locked_until).getTime();
    if (now < lockExpiry) {
      return { ok: false, retryAfter: Math.ceil((lockExpiry - now) / 1000), locked: true };
    }
    // Lock expired — reset
    await upsertCounter({
      ...row,
      count: 0,
      fails: 0,
      locked_until: null,
      window_start: windowStart,
    });
  }

  // Check window expiry
  const rowWindowStart = new Date(row.window_start).getTime();
  if (now >= rowWindowStart + windowMs) {
    // Window expired — reset
    await upsertCounter({
      bucket: key,
      window_start: windowStart,
      count: 1,
      fails: 0,
      locked_until: null,
    });
    return { ok: true };
  }

  // Within window — increment and check
  const newCount = row.count + 1;
  if (newCount > limit) {
    const retryAfter = Math.ceil((rowWindowStart + windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }

  await upsertCounter({ ...row, count: newCount });
  return { ok: true };
}

/**
 * Record a failure for lockout tracking.
 * After `lockoutAfter` failures within a window → lock for `lockoutMs`.
 */
export async function fail(
  key: string,
  opts: RateLimitOpts = {},
): Promise<void> {
  const windowMs = opts.windowMs ?? 60_000;
  const lockoutAfter = opts.lockoutAfter ?? 0;
  const lockoutMs = opts.lockoutMs ?? 0;
  const now = Date.now();

  if (lockoutAfter <= 0) return;

  const row = await readCounter(key);
  if (!row) {
    await upsertCounter({
      bucket: key,
      window_start: new Date(now).toISOString(),
      count: 0,
      fails: 1,
      locked_until: null,
    });
    return;
  }

  const newFails = row.fails + 1;
  if (newFails >= lockoutAfter) {
    const lockUntil = new Date(now + lockoutMs).toISOString();
    await upsertCounter({ ...row, fails: 0, locked_until: lockUntil });
    log.warn('rate-limit.lockout', { key, fails: newFails, lockoutMs });
  } else {
    await upsertCounter({ ...row, fails: newFails });
  }
}

// ── In-memory fallback (when Postgres is down) ───────────────────────────────
// Same logic as the old rate-limit.ts — per-instance, not shared, but at least
// the service doesn't crash.

interface MemBucket {
  count: number;
  fails: number;
  resetAt: number;
  lockUntil: number;
}

const memBuckets = new Map<string, MemBucket>();

function memoryCheck(key: string, opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  const limit = opts.limit ?? 5;
  const windowMs = opts.windowMs ?? 60_000;
  let b = memBuckets.get(key);
  if (!b) {
    b = { count: 0, fails: 0, resetAt: now + windowMs, lockUntil: 0 };
    memBuckets.set(key, b);
  }
  if (b.lockUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockUntil - now) / 1000), locked: true };
  }
  if (now >= b.resetAt) {
    b.resetAt = now + windowMs;
    b.count = 0;
    b.fails = 0;
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true };
}

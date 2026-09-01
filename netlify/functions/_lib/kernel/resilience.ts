/**
 * kernel/resilience.ts — Retry, circuit breaker, and bulkhead
 *
 * WHY THIS EXISTS
 * ---------------
 * A single hung or failing dependency (PostgREST, Gemini, Fonnte) currently
 * takes down the entire request. This module provides three resilience patterns:
 *
 *   1. RETRY with full jitter — prevents thundering herd on recovery
 *   2. CIRCUIT BREAKER — fail fast when a dependency is down (no wasted RTTs)
 *   3. BULKHEAD — limit concurrent in-flight calls per dependency
 *
 * Design decisions:
 *   - In-process state is acceptable for breakers (fail-fast, not consensus).
 *   - Full jitter (not exponential) to avoid lockstep retries across instances.
 *   - Non-idempotent calls should NOT use retry (only the caller knows).
 *
 * USAGE
 * -----
 *   import { withRetry, breaker, bulkhead } from '../kernel/resilience';
 *
 *   const data = await withRetry(
 *     () => requestJson(url, opts),
 *     { attempts: 3, base: 200, max: 2000, idempotent: true },
 *   );
 *
 *   // Or use the higher-level callWithProtection:
 *   const data = await callWithProtection('postgrest', () => fetch(...), {
 *     retry: { attempts: 2 },
 *   });
 */

import { AppError } from './errors';
import { log } from './log';

// ── Retry ───────────────────────────────────────────────────────────────────

export interface RetryOpts {
  /** Max retry attempts (total calls = attempts + 1). Default: 2. */
  attempts?: number;
  /** Base delay in ms (doubled each attempt). Default: 200. */
  base?: number;
  /** Max delay cap in ms. Default: 2000. */
  max?: number;
  /** Whether the operation is idempotent. Non-idempotent = no retry. Default: true. */
  idempotent?: boolean;
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) return error.retryable;
  if (error instanceof Error) {
    const name = error.name;
    // Network/timeout errors are retryable
    if (name === 'TimeoutError' || name === 'AbortError' || name === 'FetchError') return true;
    // Check for retryable HTTP status in message
    const match = error.message.match(/HTTP (\d{3})/);
    if (match) return RETRYABLE_HTTP.has(Number(match[1]));
  }
  return false;
}

/**
 * Retry an async function with full jitter backoff.
 *
 * Full jitter: delay = random(0, min(base * 2^attempt, max))
 * This prevents thundering herd: during an outage, concurrent instances
 * retry at different times instead of all at once.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  const base = opts.base ?? 200;
  const max = opts.max ?? 2_000;
  const idempotent = opts.idempotent ?? true;

  let lastError: unknown;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const canRetry =
        idempotent &&
        attempt < attempts &&
        isRetryable(e);

      if (!canRetry) throw e;

      // Full jitter: random between 0 and the backoff ceiling
      const ceiling = Math.min(base * 2 ** attempt, max);
      const delay = Math.random() * ceiling;
      log.debug('retry.backoff', {
        attempt: attempt + 1,
        delayMs: Math.round(delay),
        error: String(e).slice(0, 100),
      });
      await sleep(delay);
    }
  }

  // Unreachable but satisfies TS
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Circuit Breaker ─────────────────────────────────────────────────────────

export type BreakerState = 'closed' | 'open' | 'half-open';

export interface BreakerOpts {
  /** Failures in window before opening. Default: 5. */
  threshold?: number;
  /** Rolling window in ms. Default: 30000. */
  windowMs?: number;
  /** Time in open state before half-open probe. Default: 15000. */
  coolDownMs?: number;
}

interface BreakerRecord {
  state: BreakerState;
  failures: number;
  windowStart: number;
  openedAt: number;
}

class CircuitBreaker {
  private records = new Map<string, BreakerRecord>();
  private opts: Required<BreakerOpts>;

  constructor(opts: BreakerOpts = {}) {
    this.opts = {
      threshold: opts.threshold ?? 5,
      windowMs: opts.windowMs ?? 30_000,
      coolDownMs: opts.coolDownMs ?? 15_000,
    };
  }

  /** Check if the breaker allows a call. Throws if open. */
  check(dep: string): void {
    const rec = this.records.get(dep);
    if (!rec) return; // No record = closed

    const now = Date.now();

    if (rec.state === 'open') {
      if (now - rec.openedAt >= this.opts.coolDownMs) {
        // Transition to half-open: allow one probe
        rec.state = 'half-open';
        log.info('breaker.half-open', { dep });
        return;
      }
      throw new AppError('SERVICE_UNAVAILABLE', {
        message: `Circuit breaker open for ${dep}`,
        retryable: false,
      });
    }

    if (rec.state === 'half-open') {
      // Already have a probe in flight; block further calls
      throw new AppError('SERVICE_UNAVAILABLE', {
        message: `Circuit breaker probing ${dep}`,
        retryable: false,
      });
    }
  }

  /** Record a successful call. */
  success(dep: string): void {
    const rec = this.records.get(dep);
    if (rec && rec.state === 'half-open') {
      // Probe succeeded — close the breaker
      this.records.delete(dep);
      log.info('breaker.closed', { dep });
    } else if (rec) {
      // Reset failure count in window
      const now = Date.now();
      if (now - rec.windowStart >= this.opts.windowMs) {
        rec.failures = 0;
        rec.windowStart = now;
      }
    }
  }

  /** Record a failed call. Opens the breaker if threshold exceeded. */
  failure(dep: string): void {
    const now = Date.now();
    let rec = this.records.get(dep);

    if (!rec) {
      rec = { state: 'closed', failures: 0, windowStart: now, openedAt: 0 };
      this.records.set(dep, rec);
    }

    // Reset window if expired
    if (now - rec.windowStart >= this.opts.windowMs) {
      rec.failures = 0;
      rec.windowStart = now;
    }

    if (rec.state === 'half-open') {
      // Probe failed — re-open
      rec.state = 'open';
      rec.openedAt = now;
      log.warn('breaker.reopened', { dep });
      return;
    }

    rec.failures++;
    if (rec.failures >= this.opts.threshold) {
      rec.state = 'open';
      rec.openedAt = now;
      log.warn('breaker.opened', { dep, failures: rec.failures });
    }
  }

  /** Get current state for observability. */
  getState(dep: string): BreakerState {
    return this.records.get(dep)?.state ?? 'closed';
  }

  /** Reset a specific dependency (for testing/manual recovery). */
  reset(dep: string): void {
    this.records.delete(dep);
  }
}

/** Singleton breaker instance (in-process state is acceptable for fail-fast). */
export const breaker = new CircuitBreaker();

// ── Bulkhead ────────────────────────────────────────────────────────────────

/**
 * Concurrency limiter per dependency. Prevents one slow dependency from
 * exhausting the function's ability to handle other work.
 *
 * Usage:
 *   const release = await bulkhead.acquire('gemini');
 *   try { await callGemini(); }
 *   finally { release(); }
 */
class Bulkhead {
  private inflight = new Map<string, number>();
  private maxConcurrent: number;

  constructor(maxConcurrent = 8) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(dep: string): Promise<() => void> {
    const current = this.inflight.get(dep) ?? 0;
    if (current >= this.maxConcurrent) {
      throw new AppError('SERVICE_UNAVAILABLE', {
        message: `Bulkhead limit reached for ${dep} (${current}/${this.maxConcurrent})`,
        retryable: true,
      });
    }
    this.inflight.set(dep, current + 1);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const c = this.inflight.get(dep) ?? 1;
      this.inflight.set(dep, Math.max(0, c - 1));
    };
  }

  /** Get current inflight count for observability. */
  getInflight(dep: string): number {
    return this.inflight.get(dep) ?? 0;
  }
}

export const bulkhead = new Bulkhead(8);

// ── Combined protection ─────────────────────────────────────────────────────

export interface CallOpts {
  retry?: RetryOpts;
  /** Skip the circuit breaker (for critical paths). Default: false. */
  noBreaker?: boolean;
}

/**
 * High-level wrapper: retry + circuit breaker + bulkhead.
 *
 *   const data = await callWithProtection('postgrest', async () => {
 *     return await requestJson(url, opts);
 *   }, { retry: { attempts: 2, idempotent: true } });
 */
export async function callWithProtection<T>(
  dep: string,
  fn: () => Promise<T>,
  opts: CallOpts = {},
): Promise<T> {
  const release = await bulkhead.acquire(dep);
  try {
    const result = await withRetry(
      async () => {
        if (!opts.noBreaker) {
          breaker.check(dep);
        }
        try {
          const r = await fn();
          if (!opts.noBreaker) {
            breaker.success(dep);
          }
          return r;
        } catch (e) {
          if (!opts.noBreaker) {
            breaker.failure(dep);
          }
          throw e;
        }
      },
      { ...opts.retry, idempotent: opts.retry?.idempotent ?? true },
    );
    return result;
  } finally {
    release();
  }
}

// ── Default breaker configs per dependency (§4.3) ───────────────────────────

export const DEPENDENCY_CONFIGS: Record<string, BreakerOpts> = {
  postgrest: { threshold: 5, windowMs: 30_000, coolDownMs: 15_000 },
  gemini:    { threshold: 3, windowMs: 60_000, coolDownMs: 30_000 },
  fonnte:    { threshold: 3, windowMs: 60_000, coolDownMs: 60_000 },
  fcm:       { threshold: 10, windowMs: 60_000, coolDownMs: 15_000 },
  storage:   { threshold: 5, windowMs: 60_000, coolDownMs: 15_000 },
};

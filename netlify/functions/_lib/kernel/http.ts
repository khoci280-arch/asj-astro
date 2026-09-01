/**
 * kernel/http.ts — Centralized HTTP client with timeout + error taxonomy
 *
 * WHY THIS EXISTS
 * ---------------
 * Every outbound fetch in the codebase currently uses bare `fetch()` with no
 * timeout. A single hung PostgREST call consumes the entire 10 s Netlify
 * function budget. This module provides:
 *
 *   1. Per-request timeout via AbortSignal.timeout()
 *   2. Typed errors (UPSTREAM_TIMEOUT, HTTP_ERROR) for retry/breaker decisions
 *   3. A single place to add keep-alive, connection pooling, or tracing later
 *   4. Retry with full jitter (via resilience module)
 *   5. Circuit breaker + bulkhead (via resilience module)
 *
 * MIGRATION
 * ---------
 * Phase 1: wire into db/client.ts supabaseJson() only.
 * Phase 2: wire into all outbound fetch() calls.
 * Phase 5: added retry/breaker/bulkhead via resilience module.
 */

/** Timeouts per dependency (ms). Strictly < 10 s Netlify function limit. */
export const BUDGETS = {
  /** PostgREST reads — must leave room for write + response assembly */
  postgrest_read:  2_000,
  /** PostgREST writes — no retry on non-idempotent, but still need timeout */
  postgrest_write: 3_000,
  /** Supabase Storage operations */
  storage:         5_000,
  /** External APIs (Gemini, Fonnte, FCM) */
  external:        5_000,
  /** AI chat — generous, but must not exceed 10 s */
  ai_chat:         8_000,
} as const;

export type BudgetKey = keyof typeof BUDGETS;

/**
 * §9.2 Connection pool configuration.
 *
 * Supabase caps Postgres connections (~60 on free/Pro tiers) fronted by Supavisor.
 * Functions MUST connect through the Supavisor transaction-mode pooler (port 6543),
 * NOT the direct connection (port 5432).
 *
 * max_connections_used = instances × pool.connections
 * With 60-connection budget and 8 per instance: ~7 concurrent instances.
 *
 * Deployment:
 *   - Set SUPABASE_URL to use port 6543 (Supavisor pooler)
 *   - Set statement_timeout=5s server-side via ALTER DATABASE or pg_hba.conf
 *   - Cap Netlify function concurrency to prevent connection exhaustion
 */
export const POOL_CONFIG = {
  /** Max concurrent in-flight requests per dependency per instance */
  connectionsPerInstance: 8,
  /** Max concurrent instances (conservative, depends on Supabase plan) */
  maxInstances: 7,
  /** Server-side statement timeout (ms) — enforced via header */
  statementTimeoutRead: 2_000,
  statementTimeoutWrite: 3_000,
} as const;

/**
 * Custom error for upstream failures. Carries enough context for the caller
 * to decide retry/degradation without inspecting the raw error.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean = status >= 500 || status === 429,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class TimeoutError extends Error {
  constructor(url: string, budgetMs: number) {
    super(`Timeout after ${budgetMs}ms: ${url}`);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch wrapper with timeout. Drop-in replacement for fetch() in the codebase.
 *
 * Usage:
 *   const data = await request(url, { budgetMs: BUDGETS.postgrest_read });
 */
export async function request(
  url: string,
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey; action?: string } = {},
): Promise<Response> {
  const { budgetMs: explicitBudget, budgetKey, action: actionName, ...fetchInit } = init;
  const budgetMs = explicitBudget ?? (budgetKey ? BUDGETS[budgetKey] : BUDGETS.postgrest_read);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);

  // Merge caller's signal with our timeout
  const signal = fetchInit.signal
    ? AbortSignal.any([fetchInit.signal, controller.signal])
    : controller.signal;

  // Phase 7: propagate traceparent for distributed tracing (§10.3)
  const traceparent = (globalThis as any).__traceparent as string | undefined;
  const headers = new Headers(fetchInit.headers as HeadersInit | undefined);
  if (traceparent && !headers.has('traceparent')) {
    headers.set('traceparent', traceparent);
  }

  // §9.2: Set statement_timeout on PostgREST reads to prevent runaway queries
  // from pinning connections. Writes get a separate, slightly longer timeout.
  if (dep === 'postgrest') {
    const stmtTimeout = isRead ? '2000' : '3000';
    if (!headers.has('statement_timeout')) {
      headers.set('statement_timeout', stmtTimeout);
    }
  }

  const startTime = Date.now();
  const dep = detectDependency(url);

  // Retry reads (GET) with circuit breaker. Non-idempotent writes (POST/PATCH/DELETE)
  // should NOT be retried at this level — the caller controls idempotency.
  const isRead = !fetchInit.method || fetchInit.method.toUpperCase() === 'GET';
  const shouldProtect = isRead && !!dep;

  // Acquire bulkhead slot
  const release = shouldProtect ? await acquireBulkhead(dep) : null;

  try {
    if (shouldProtect) {
      checkBreaker(dep);
    }

    const res = await fetch(url, { ...fetchInit, headers, signal });
    const durationMs = Date.now() - startTime;
    clearTimeout(timer);
    if (shouldProtect) recordBreakerSuccess(dep);
    metrics.increment('dependency.call', { dep, outcome: 'success' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      void logDependencyCall(dep, actionName, budgetMs, durationMs, 'http_error', res.status);
      throw new HttpError(
        `HTTP ${res.status} ${url}: ${body.slice(0, 200)}`,
        res.status,
      );
    }
    // Log successful call (only if slow or for sampling)
    if (durationMs > 100 || Math.random() < 0.05) {
      void logDependencyCall(dep, actionName, budgetMs, durationMs, 'ok');
    }
    return res;
  } catch (e: unknown) {
    const durationMs = Date.now() - startTime;
    clearTimeout(timer);
    if (shouldProtect) recordBreakerFailure(dep);
    metrics.increment('dependency.call', { dep, outcome: 'error' });
    if (e instanceof HttpError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      void logDependencyCall(dep, actionName, budgetMs, durationMs, 'timeout');
      throw new TimeoutError(url, budgetMs);
    }
    void logDependencyCall(dep, actionName, budgetMs, durationMs, 'network_error');
    throw e;
  } finally {
    release?.();
  }
}

/**
 * Convenience: fetch + parse JSON with timeout.
 * Direct replacement for the fetch+JSON pattern in supabaseJson().
 */
export async function requestJson<T = unknown>(
  url: string,
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey; action?: string } = {},
): Promise<T> {
  const res = await request(url, init);
  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

// ── Retry wrapper for reads ─────────────────────────────────────────────────

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableError(e: unknown): boolean {
  if (e instanceof HttpError) return RETRYABLE_HTTP.has(e.status);
  if (e instanceof TimeoutError) return true;
  if (e instanceof Error) {
    const name = e.name;
    if (name === 'TimeoutError' || name === 'AbortError' || name === 'FetchError') return true;
  }
  return false;
}

/**
 * Request with retry + full jitter. For GET (read) requests only.
 * POST/PATCH/DELETE should not retry at this level — caller handles idempotency.
 *
 * Usage:
 *   const data = await requestWithRetry(url, { budgetKey: 'postgrest_read' });
 */
export async function requestWithRetry(
  url: string,
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey; action?: string } = {},
  opts: { attempts?: number; baseMs?: number; maxMs?: number } = {},
): Promise<Response> {
  const { attempts = 2, baseMs = 200, maxMs = 2000 } = opts;
  const isRead = !init.method || init.method.toUpperCase() === 'GET';
  if (!isRead) return request(url, init); // Don't retry writes

  let lastError: unknown;
  for (let attempt = 0; ; attempt++) {
    try {
      return await request(url, init);
    } catch (e) {
      lastError = e;
      if (attempt >= attempts || !isRetryableError(e)) throw e;
      const ceiling = Math.min(baseMs * 2 ** attempt, maxMs);
      const delay = Math.random() * ceiling;
      log.debug('http.retry', { url: url.slice(0, 80), attempt: attempt + 1, delayMs: Math.round(delay) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * JSON request with retry + full jitter. For GET (read) requests only.
 */
export async function requestJsonWithRetry<T = unknown>(
  url: string,
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey; action?: string } = {},
  opts: { attempts?: number; baseMs?: number; maxMs?: number } = {},
): Promise<T> {
  const res = await requestWithRetry(url, init, opts);
  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

// ── Dependency detection ──────────────────────────────────────────────────────

function detectDependency(url: string): string {
  if (url.includes('supabase')) return 'postgrest';
  if (url.includes('storage')) return 'storage';
  if (url.includes('generativelanguage') || url.includes('gemini')) return 'gemini';
  if (url.includes('fonnte') || url.includes('api.fonnte')) return 'fonnte';
  if (url.includes('fcm') || url.includes('fcm.googleapis')) return 'fcm';
  if (url.includes('cloudinary')) return 'cloudinary';
  return 'other';
}

// ── Circuit breaker + bulkhead (inline, no import from resilience to avoid circular) ─
// These are lightweight in-process state — acceptable for fail-fast decisions.
// The full resilience module provides withRetry + callWithProtection for handler use.

type BreakerState = 'closed' | 'open' | 'half-open';
interface BreakerRecord { state: BreakerState; failures: number; windowStart: number; openedAt: number; }
const breakers = new Map<string, BreakerRecord>();
const BREAKER_CONFIGS: Record<string, { threshold: number; windowMs: number; coolDownMs: number }> = {
  postgrest: { threshold: 5, windowMs: 30_000, coolDownMs: 15_000 },
  gemini:    { threshold: 3, windowMs: 60_000, coolDownMs: 30_000 },
  fonnte:    { threshold: 3, windowMs: 60_000, coolDownMs: 60_000 },
  fcm:       { threshold: 10, windowMs: 60_000, coolDownMs: 15_000 },
  storage:   { threshold: 5, windowMs: 60_000, coolDownMs: 15_000 },
};

function checkBreaker(dep: string): void {
  const cfg = BREAKER_CONFIGS[dep];
  if (!cfg) return;
  const rec = breakers.get(dep);
  if (!rec) return;
  const now = Date.now();
  if (rec.state === 'open' && now - rec.openedAt >= cfg.coolDownMs) {
    rec.state = 'half-open';
    log.info('breaker.half-open', { dep });
    return;
  }
  if (rec.state === 'open' || rec.state === 'half-open') {
    throw new AppError('SERVICE_UNAVAILABLE', { message: `Circuit breaker open for ${dep}`, retryable: false });
  }
}

function recordBreakerSuccess(dep: string): void {
  const rec = breakers.get(dep);
  if (!rec) return;
  if (rec.state === 'half-open') { breakers.delete(dep); log.info('breaker.closed', { dep }); return; }
  const now = Date.now();
  const cfg = BREAKER_CONFIGS[dep];
  if (cfg && now - rec.windowStart >= cfg.windowMs) { rec.failures = 0; rec.windowStart = now; }
}

function recordBreakerFailure(dep: string): void {
  const cfg = BREAKER_CONFIGS[dep];
  if (!cfg) return;
  const now = Date.now();
  let rec = breakers.get(dep);
  if (!rec) { rec = { state: 'closed', failures: 0, windowStart: now, openedAt: 0 }; breakers.set(dep, rec); }
  if (now - rec.windowStart >= cfg.windowMs) { rec.failures = 0; rec.windowStart = now; }
  if (rec.state === 'half-open') { rec.state = 'open'; rec.openedAt = now; log.warn('breaker.reopened', { dep }); return; }
  rec.failures++;
  if (rec.failures >= cfg.threshold) { rec.state = 'open'; rec.openedAt = now; log.warn('breaker.opened', { dep, failures: rec.failures }); }
}

// Bulkhead: limit concurrent in-flight calls per dependency
const bulkheadInflight = new Map<string, number>();
const BULKHEAD_MAX = 8;

async function acquireBulkhead(dep: string): Promise<(() => void) | null> {
  const current = bulkheadInflight.get(dep) ?? 0;
  if (current >= BULKHEAD_MAX) {
    throw new AppError('SERVICE_UNAVAILABLE', { message: `Bulkhead limit for ${dep}`, retryable: true });
  }
  bulkheadInflight.set(dep, current + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bulkheadInflight.set(dep, Math.max(0, (bulkheadInflight.get(dep) ?? 1) - 1));
  };
}

import { AppError } from './errors';
import { metrics } from './metrics';

// ── Dependency call logging ───────────────────────────────────────────────────
// Writes to dependency_calls table. Fire-and-forget: never blocks the caller.
// Uses supabaseJson directly to avoid circular import with db/client.ts.

async function logDependencyCall(
  dep: string,
  action: string | undefined,
  budgetMs: number,
  durationMs: number,
  outcome: string,
  statusCode?: number,
): Promise<void> {
  try {
    await supabaseJson('POST', 'dependency_calls', {
      body: {
        dep,
        action: action ?? 'unknown',
        budget_ms: budgetMs,
        duration_ms: durationMs,
        outcome,
        status_code: statusCode ?? null,
        attempts: 1,
      },
      headers: { Prefer: 'return=minimal' },
    });
  } catch {
    // Logging must never fail the request. Silently drop.
  }
}

// Import supabaseJson at module level (lazy to avoid circular dep issues)
import { supabaseJson } from '../db/client';

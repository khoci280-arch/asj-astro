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
 *
 * MIGRATION
 * ---------
 * Phase 1: wire into db/client.ts supabaseJson() only.
 * Phase 2: wire into all outbound fetch() calls.
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
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey } = {},
): Promise<Response> {
  const { budgetMs: explicitBudget, budgetKey, ...fetchInit } = init;
  const budgetMs = explicitBudget ?? (budgetKey ? BUDGETS[budgetKey] : BUDGETS.postgrest_read);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);

  // Merge caller's signal with our timeout
  const signal = fetchInit.signal
    ? AbortSignal.any([fetchInit.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(url, { ...fetchInit, signal });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpError(
        `HTTP ${res.status} ${url}: ${body.slice(0, 200)}`,
        res.status,
      );
    }
    return res;
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof HttpError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new TimeoutError(url, budgetMs);
    }
    throw e;
  }
}

/**
 * Convenience: fetch + parse JSON with timeout.
 * Direct replacement for the fetch+JSON pattern in supabaseJson().
 */
export async function requestJson<T = unknown>(
  url: string,
  init: RequestInit & { budgetMs?: number; budgetKey?: BudgetKey } = {},
): Promise<T> {
  const res = await request(url, init);
  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

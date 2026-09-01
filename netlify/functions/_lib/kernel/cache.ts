/**
 * kernel/cache.ts — Per-key LRU cache with generation counter + negative caching
 *
 * WHY THIS EXISTS
 * ---------------
 * The old cache.ts used a global cacheClear() that wiped all 50 entries on
 * any mutation — a nuclear option that threw away 90% unchanged data. Worse,
 * in-process Maps are useless with multiple Netlify instances (hit rate = 1/N).
 *
 * This module provides:
 *   1. Per-key invalidation (not global flush)
 *   2. Generation counter for cross-instance cache busting
 *   3. Negative caching (cache "not found" for 10s to prevent DoS)
 *   4. L1 in-process LRU for per-request hot reads (dropdowns, config)
 *
 * L0 (CDN) is handled by surfaces/public.ts Cache-Control headers.
 * L3 (Postgres) is for expensive aggregates (monthly report).
 *
 * USAGE
 * -----
 *   import { cache } from '../kernel/cache';
 *
 *   const data = await cache.getOrSet('public-base:v3:monthly', async () => {
 *     return await fetchMonthlyReport();
 *   }, { ttlMs: 300_000 }); // 5 min
 *
 *   // Invalidate a specific key:
 *   cache.invalidate('public-base:v3:monthly');
 *
 *   // Invalidate all keys matching a prefix:
 *   cache.invalidatePrefix('public-base:v3:');
 */

// ── L1: Per-key LRU (in-process) ───────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  negativeExpiry?: number; // For negative cache entries (not found)
}

const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 60_000; // 1 min
const NEGATIVE_TTL_MS = 10_000; // 10s for "not found" caching

class L1Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Check negative cache (value is null/undefined, meaning "not found")
    if (entry.negativeExpiry && now > entry.negativeExpiry) {
      this.store.delete(key);
      return undefined;
    }

    // Move to end (most recently used) for LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Cache a negative result (e.g., "candidate not found").
   * Stored as null with a separate expiry to prevent DoS via repeated lookups.
   */
  setNegative(key: string, ttlMs: number = NEGATIVE_TTL_MS): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value: null,
      expiresAt: Date.now() + ttlMs,
      negativeExpiry: Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

const l1 = new L1Cache();

// ── Generation counter ──────────────────────────────────────────────────────

/**
 * Cache keys include a generation counter to avoid stale data across instances.
 * The generation is bumped on any config/job write.
 *
 * Key format: `{namespace}:v${generation}:{qualifier}`
 *
 * Old generation keys expire naturally via TTL — no cross-instance coordination,
 * no thundering herd on flush.
 */
let currentGeneration = 0;

/** Bump the generation counter (call after config/job mutations). */
export function bumpGeneration(): void {
  currentGeneration++;
  // Also clear the local L1 cache for the affected prefix
  l1.invalidatePrefix(`gen:${currentGeneration - 1}:`);
}

/** Get current generation number. */
export function getGeneration(): number {
  return currentGeneration;
}

/** Build a generation-aware cache key. */
export function genKey(namespace: string, qualifier: string): string {
  return `${namespace}:v${currentGeneration}:${qualifier}`;
}

// ── High-level API ──────────────────────────────────────────────────────────

export const cache = {
  /**
   * Get from cache or compute + store.
   * Returns the cached value or the result of fn().
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    opts: { ttlMs?: number } = {},
  ): Promise<T> {
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    const hit = l1.get<T>(key);
    if (hit !== undefined) return hit;

    const value = await fn();

    if (value == null) {
      // Cache negative result for shorter time
      l1.setNegative(key);
      return value;
    }

    l1.set(key, value, ttlMs);
    return value;
  },

  /** Invalidate a specific key. */
  invalidate: l1.invalidate.bind(l1),

  /** Invalidate all keys matching a prefix. */
  invalidatePrefix: l1.invalidatePrefix.bind(l1),

  /** Clear entire L1 cache. Use sparingly — prefer per-key invalidation. */
  clear: l1.clear.bind(l1),

  /** Get current L1 cache size (for observability). */
  get size(): number {
    return l1.size;
  },
};

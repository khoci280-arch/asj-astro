// cache.js — TTL cache in-memory sederhana (satu proses function).
//
// Dipakai untuk data PUBLIK yang identik untuk semua user (jobs/dropdowns/
// assets/pengumuman) supaya request berikutnya tidak perlu roundtrip ke
// Supabase. Cache per-instance function (Netlify: per warm instance; preview:
// 1 proses) — cukup untuk skala ASJ, tanpa Redis.

interface CacheEntry { value: unknown; expiresAt: number }
const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 20_000;
const MAX_ENTRIES = 50;

function cacheGet<T = unknown>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict entri paling tua (Map mempertahankan urutan insert).
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cacheClear() {
  store.clear();
}

export { cacheGet, cacheSet, cacheClear };

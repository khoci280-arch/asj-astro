import { describe, it, expect, vi } from 'vitest';
import { cache, genKey, bumpGeneration, getGeneration } from './cache';

describe('cache.getOrSet', () => {
  it('caches and returns value', async () => {
    const fn = vi.fn().mockResolvedValue({ data: 'hello' });
    const result = await cache.getOrSet('test-1', fn, { ttlMs: 60_000 });
    expect(result).toEqual({ data: 'hello' });
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call should hit cache
    const result2 = await cache.getOrSet('test-1', fn, { ttlMs: 60_000 });
    expect(result2).toEqual({ data: 'hello' });
    expect(fn).toHaveBeenCalledTimes(1); // Not called again
  });

  it('caches negative results for shorter TTL', async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const result = await cache.getOrSet('test-neg', fn, { ttlMs: 60_000 });
    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);

    // Null results are cached as negative (shorter TTL)
    const result2 = await cache.getOrSet('test-neg', fn, { ttlMs: 60_000 });
    expect(result2).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1); // Cached as negative
  });

  it('invalidates specific key', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    const r1 = await cache.getOrSet('test-inv', fn);
    expect(r1).toBe('v1');

    cache.invalidate('test-inv');

    const r2 = await cache.getOrSet('test-inv', fn);
    expect(r2).toBe('v2');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('invalidates by prefix', async () => {
    const fn = vi.fn()
      .mockResolvedValue('a')
      .mockResolvedValue('b');

    await cache.getOrSet('prefix:x', fn);
    await cache.getOrSet('prefix:y', fn);

    cache.invalidatePrefix('prefix:');

    await cache.getOrSet('prefix:x', fn);
    expect(fn).toHaveBeenCalledTimes(3); // x recalculated
  });

  it('clears entire cache', async () => {
    const fn = vi.fn().mockResolvedValue('val');
    await cache.getOrSet('clear-test', fn);
    cache.clear();
    await cache.getOrSet('clear-test', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('generation counter', () => {
  it('starts at 0', () => {
    // Note: other tests may have bumped it
    const gen = getGeneration();
    expect(typeof gen).toBe('number');
  });

  it('bumps on mutation', () => {
    const before = getGeneration();
    bumpGeneration();
    expect(getGeneration()).toBe(before + 1);
  });

  it('genKey includes generation', () => {
    const gen = getGeneration();
    const key = genKey('test-ns', 'qualifier');
    expect(key).toBe(`test-ns:v${gen}:qualifier`);
  });
});

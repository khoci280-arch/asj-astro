import { describe, expect, it } from 'vitest';
import { hashBytes, hashString } from './hash.js';

describe('hash', () => {
  it('is deterministic and 128-bit hex (32 chars)', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('differs on any input change', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('abc')).not.toBe(hashString('abc\n'));
  });

  it('hashes bytes', () => {
    expect(hashBytes(new Uint8Array([1, 2, 3]))).toBe(hashBytes(new Uint8Array([1, 2, 3])));
    expect(hashBytes(new Uint8Array([1, 2, 3]))).not.toBe(hashBytes(new Uint8Array([1, 2, 4])));
  });
});
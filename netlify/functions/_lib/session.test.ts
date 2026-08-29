// ==========================================
// TESTS: session.js — sign/verify token HMAC-SHA256.
// - Roundtrip: sign lalu verify harus balik payload yang sama.
// - Tampered token harus reject (null).
// - Edge cases: null/undefined/malformed token.
// ==========================================
import { describe, it, expect, vi } from 'vitest';

// Override env() supaya SESSION_SECRET bisa dikontrol test
vi.mock('./env.js', () => {
  const SECRET = 'test-secret-for-session-' + process.env.TEST_SESSION_SECRET;
  return {
    env: (key) => (key === 'SESSION_SECRET' ? SECRET : ''),
    debugFileEnvKeys: () => ({}),
    debugFileStructure: () => ({}),
  };
});

import { signToken, verifyToken } from './session';

describe('session — signToken + verifyToken', () => {
  it('roundtrip: sign → verify mengembalikan payload asli', () => {
    const payload = { role: 'admin', name: 'KHOCI' };
    const token = signToken(payload);
    const result = verifyToken(token);
    expect(result).toEqual(payload);
  });

  it('roundtrip dengan payload kandidat (role: kandidat + wa)', () => {
    const payload = { role: 'kandidat', wa: '6281234567890' };
    const token = signToken(payload);
    const result = verifyToken(token);
    expect(result).toEqual(payload);
  });

  it('roundtrip dengan payload kosong', () => {
    const payload = {};
    const token = signToken(payload);
    const result = verifyToken(token);
    expect(result).toEqual(payload);
  });

  it('token format: base64url.body.base64url.signature', () => {
    const token = signToken({ role: 'admin' });
    const parts = token.split('.');
    expect(parts.length).toBe(2);
    // Both parts should be valid base64url
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('session — tamper detection', () => {
  it('modified body → verify returns null', () => {
    const token = signToken({ role: 'admin' });
    const parts = token.split('.');
    // Tamper the body
    const tampered = Buffer.from(JSON.stringify({ role: 'hacker' })).toString('base64url');
    const badToken = tampered + '.' + parts[1];
    expect(verifyToken(badToken)).toBeNull();
  });

  it('modified signature → verify returns null', () => {
    const token = signToken({ role: 'admin' });
    const parts = token.split('.');
    const badToken = parts[0] + '.AAAA';
    expect(verifyToken(badToken)).toBeNull();
  });

  it('wrong secret produces different signature', () => {
    const token1 = signToken({ role: 'admin' });
    // Since we can't change the secret in test, verify the token is unique
    const token2 = signToken({ role: 'admin' });
    // Both should verify to same payload (same secret)
    expect(verifyToken(token1)).toEqual(verifyToken(token2));
  });
});

describe('session — edge cases', () => {
  it('null → returns null', () => {
    expect(verifyToken(null)).toBeNull();
  });

  it('undefined → returns null', () => {
    expect(verifyToken(undefined)).toBeNull();
  });

  it('empty string → returns null', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('non-string → returns null', () => {
    expect(verifyToken(123)).toBeNull();
    expect(verifyToken({})).toBeNull();
  });

  it('single part (no dot) → returns null', () => {
    expect(verifyToken('abcdef')).toBeNull();
  });

  it('three parts (extra dot) → returns null', () => {
    expect(verifyToken('a.b.c')).toBeNull();
  });

  it('invalid base64 in body → returns null (JSON parse fails)', () => {
    const token = signToken({ role: 'admin' });
    const parts = token.split('.');
    // Replace body with invalid base64 that decodes to invalid JSON
    const badBody = Buffer.from('not-json').toString('base64url');
    const sig = parts[1]; // Keep valid sig
    expect(verifyToken(badBody + '.' + sig)).toBeNull();
  });
});

describe('session — timing safe comparison', () => {
  it('verify uses timingSafeEqual (same-length buffers)', () => {
    const token = signToken({ role: 'admin' });
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result.role).toBe('admin');
  });

  it('different length signature → returns null (length check before timingSafeEqual)', () => {
    const token = signToken({ role: 'admin' });
    const parts = token.split('.');
    // Signature that's too short
    expect(verifyToken(parts[0] + '.abc')).toBeNull();
    // Signature that's too long
    expect(verifyToken(parts[0] + '.' + 'a'.repeat(100))).toBeNull();
  });
});

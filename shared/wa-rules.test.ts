// ==========================================
// TESTS: shared/wa-rules — isValidWaFormat gate (login/daftar kandidat).
// Relocated from the retired _lib/actions-auth dispatcher suite (2026-09-04):
// isValidWaFormat always lived here — actions-auth only re-exported it.
// Hanya /^628\d{9,10}$/ yang diterima — WA typo (mis. 6223… vs 6282…,
// kasus SATRIA 2026-08-15) ditolak supaya tidak bikin kandidat duplikat.
// ==========================================
import { describe, it, expect } from 'vitest';
import { isValidWaFormat } from './wa-rules';

describe('isValidWaFormat — gate login/daftar kandidat', () => {
  it('menerima 628… 13 digit (awalan HP baku)', () => {
    expect(isValidWaFormat('6281234567890')).toBe(true);
    expect(isValidWaFormat('6282130442661')).toBe(true);
  });

  it('menerima 08xx… (dinormalisasi jadi 628…)', () => {
    expect(isValidWaFormat('081234567890')).toBe(true);
    expect(isValidWaFormat('082130442661')).toBe(true);
  });

  it('menerima 8xx… tanpa nol depan (konsisten dengan frontend)', () => {
    expect(isValidWaFormat('81234567890')).toBe(true);
    expect(isValidWaFormat('82130442661')).toBe(true);
  });

  it('menerima 628 + 9 digit (total 12)', () => {
    expect(isValidWaFormat('628123456789')).toBe(true);
  });

  it('menolak WA typo 6223… (kasus SATRIA)', () => {
    expect(isValidWaFormat('6223123456789')).toBe(false);
    expect(isValidWaFormat('622130442661')).toBe(false);
  });

  it('menolak nomor terlalu pendek / terlalu panjang', () => {
    expect(isValidWaFormat('081234')).toBe(false);
    expect(isValidWaFormat('0812345678')).toBe(false); // 628 + 8 digit → kurang
    expect(isValidWaFormat('628123456789012')).toBe(true); // 15 digit — now accepted
    expect(isValidWaFormat('6281234567890123')).toBe(false); // 16 digit — too long
  });

  it('menolak kosong / non-digit / awalan bukan 62', () => {
    expect(isValidWaFormat('')).toBe(false);
    expect(isValidWaFormat('abc')).toBe(false);
    expect(isValidWaFormat('71234567890')).toBe(false);
    expect(isValidWaFormat('08123456789012345678')).toBe(false);
  });
});

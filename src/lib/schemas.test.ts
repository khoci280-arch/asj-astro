/**
 * Unit Tests: Zod Validation Schemas
 */
import { describe, it, expect } from 'vitest';
import {
  waSchema, normalizeWaInput, emailSchema, passwordSchema,
  candidateProfileSchema, kandidatLoginSchema, registerSchema,
  validate,
} from './schemas';

describe('Zod Schemas', () => {
  describe('normalizeWaInput (B01, parity legacy shared/wa-rules)', () => {
    it('0xx… → 62xx…', () => {
      expect(normalizeWaInput('081234567890')).toBe('6281234567890');
    });
    it('8xx… (tanpa nol) → 628xx…', () => {
      expect(normalizeWaInput('81234567890')).toBe('6281234567890');
    });
    it('buang non-digit', () => {
      expect(normalizeWaInput('+62 812-3456-7890')).toBe('6281234567890');
    });
    it('628… tetap dipertahankan; kosong aman', () => {
      expect(normalizeWaInput('6281234567890')).toBe('6281234567890');
      expect(normalizeWaInput('')).toBe('');
    });
  });

  describe('waSchema', () => {
    // B01: parity legacy shared/wa-rules — gate = normalisasi + /^628\\d{9,11}$/
    it('accepts canonical 628xx phone (12-13 digit)', () => {
      expect(waSchema.safeParse('6281234567890').success).toBe(true);
      expect(waSchema.safeParse('628123456789').success).toBe(true);
    });

    it('accepts 08xx input (dinormalisasi ke 628xx)', () => {
      expect(waSchema.safeParse('081234567890').success).toBe(true);
    });

    it('accepts bare 8xx input (tanpa nol depan — regex rusak /^8d{10,12}$/ diperbaiki)', () => {
      expect(waSchema.safeParse('81234567890').success).toBe(true);
    });

    it('accepts input with separators (strip non-digit)', () => {
      expect(waSchema.safeParse('+62 812-3456-7890').success).toBe(true);
    });

    it('rejects too short phone', () => {
      expect(waSchema.safeParse('08123').success).toBe(false);
    });

    it('accepts Japan numbers (090/070/080/81xx — parity backend wa-rules)', () => {
      expect(waSchema.safeParse('09012345678').success).toBe(true); // → 819012345678
      expect(waSchema.safeParse('819012345678').success).toBe(true);
      expect(waSchema.safeParse('07012345678').success).toBe(true); // → 817012345678
    });

    it('accepts 14-15 digit Indonesia (628 + 11-12 digit — parity backend)', () => {
      expect(waSchema.safeParse('628123456789012').success).toBe(true);
    });

    it('rejects nomor terlalu pendek / tidak dikenal', () => {
      expect(waSchema.safeParse('08123').success).toBe(false);
      expect(waSchema.safeParse('9999999999999').success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('accepts valid email', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid password', () => {
      expect(passwordSchema.safeParse('1234').success).toBe(true);
    });

    it('rejects empty password', () => {
      expect(passwordSchema.safeParse('').success).toBe(false);
    });
  });

  describe('candidateProfileSchema', () => {
    it('accepts valid profile', () => {
      const result = candidateProfileSchema.safeParse({
        nama: 'Budi Santoso',
        gender: 'LAKI-LAKI',
        usia: 25,
        tb: 170,
        bb: 65,
        email: 'budi@test.com',
        alamat: 'Jl. Merdeka No. 1, Surabaya',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing nama', () => {
      const result = candidateProfileSchema.safeParse({
        nama: '',
        wa: '6281234567890',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('kandidatLoginSchema', () => {
    it('accepts valid login', () => {
      const result = kandidatLoginSchema.safeParse({
        wa: '6281234567890',
        password: '1234',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = kandidatLoginSchema.safeParse({
        wa: '6281234567890',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration', () => {
      const result = registerSchema.safeParse({
        nama: 'Budi Santoso',
        wa: '6281234567890',
        password: '1234',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('validate helper', () => {
    it('returns success for valid data', () => {
      const result = validate(waSchema, '6281234567890');
      expect(result.success).toBe(true);
    });

    it('returns errors for invalid data', () => {
      const result = validate(waSchema, '123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

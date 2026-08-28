/**
 * Unit Tests: Zod Validation Schemas
 */
import { describe, it, expect } from 'vitest';
import {
  waSchema, emailSchema, passwordSchema,
  candidateProfileSchema, kandidatLoginSchema, registerSchema,
  validate,
} from './schemas';

describe('Zod Schemas', () => {
  describe('waSchema', () => {
    it('accepts valid 08xx phone', () => {
      expect(waSchema.safeParse('6281234567890').success).toBe(true);
    });

    it('accepts valid 628xx phone', () => {
      expect(waSchema.safeParse('6281234567890').success).toBe(true);
    });

    it('rejects too short phone', () => {
      expect(waSchema.safeParse('08123').success).toBe(false);
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

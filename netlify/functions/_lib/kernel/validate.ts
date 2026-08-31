/**
 * kernel/validate.ts — Zod validation at handler boundary
 *
 * WHY THIS EXISTS
 * ---------------
 * Zero server-side input validation (CODE_REVIEW.md H7). Raw request JSON is
 * destructured and written straight to PostgREST. Invalid data (letters in WA,
 * negative ages, missing required fields) reaches the database unchecked.
 *
 * This module provides helper functions for validating handler payloads (arrays)
 * using zod schemas. On validation failure, it throws an AppError that the
 * dispatcher converts to a safe API response.
 *
 * USAGE
 * -----
 *   import { validatePayload, schemas } from '../kernel/validate';
 *   const [pin] = validatePayload(payload, schemas.adminMasterPin);
 *
 * SCHEMA DESIGN:
 *   Schemas validate the payload ARRAY (not an object) because handlers receive
 *   positional args: payload[0], payload[1], etc. Each schema is a z.tuple().
 */

import { z } from 'zod';
import { AppError } from './errors';

// ── Helper ───────────────────────────────────────────────────────────────────

/**
 * Validate a payload array against a zod tuple schema.
 * Returns the parsed values on success, throws AppError on failure.
 */
export function validatePayload<T extends z.ZodTypeAny>(
  payload: unknown,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.errors[0];
    const path = first.path.join('.');
    const msg = first.message || 'Input tidak valid';
    throw new AppError('VALIDATION_FAILED', {
      message: `${path ? path + ': ' : ''}${msg}`,
      httpStatus: 400,
    });
  }
  return result.data;
}

// ── Schemas for critical handlers ────────────────────────────────────────────

/** WA number: 10-15 digits, Indonesia or Japan format */
const waField = z.string().refine(
  (val) => {
    const digits = val.replace(/[^0-9]/g, '');
    if (!digits || digits.length < 10 || digits.length > 15) return false;
    // Indonesia: 08xx/628xx
    if (/^(08|628)/.test(digits)) return true;
    // Japan: 090/070/080 or 81xx
    if (/^(090|070|080|81)/.test(digits)) return true;
    // Generic: 10-15 digits
    return /^\d{10,15}$/.test(digits);
  },
  'Format nomor WA tidak valid (10-15 digit)',
);

/** 4-6 digit PIN (admin) */
const pinField = z.string()
  .min(1, 'PIN harus diisi')
  .max(6, 'PIN maksimal 6 digit')
  .refine((v) => /^\d{1,6}$/.test(v), 'PIN hanya boleh angka');

/** Password: min 4 chars */
const passwordField = z.string().min(4, 'Password minimal 4 karakter');

/** Nama: min 2 chars */
const namaField = z.string().min(2, 'Nama minimal 2 karakter');

// ── Auth schemas ─────────────────────────────────────────────────────────────

/** checkAdminMaster: [pin] */
export const adminMasterPin = z.tuple([pinField]);

/** checkAdminPersonal: [name, pin] */
export const adminPersonalPin = z.tuple([namaField, pinField]);

/** refreshAdminSession: [refreshToken] */
export const refreshToken = z.tuple([z.string().min(1, 'Token harus diisi')]);

/** loginKandidat: [wa, password] */
export const kandidatLogin = z.tuple([waField, passwordField]);

/** daftarKandidat: [nama, wa, password?, usia?, ...] */
export const kandidatRegister = z.tuple([
  namaField,
  waField,
  z.string().optional(),
  z.number().min(16).max(50).optional(),
]);

/** gantiPassword: [wa, lama, baru] */
export const gantiPassword = z.tuple([waField, passwordField, passwordField]);

// ── Master data schemas ──────────────────────────────────────────────────────

/** getMasterDataByWa: [wa] */
export const masterByWa = z.tuple([waField]);

// ── Schedule schemas ─────────────────────────────────────────────────────────

/** hapusJadwal: [id] */
export const hapusJadwal = z.tuple([z.string().min(1, 'ID jadwal harus diisi')]);

/** setTugasStatus: [id, status] */
export const setTugasStatus = z.tuple([
  z.string().min(1, 'ID tugas harus diisi'),
  z.string().min(1, 'Status harus diisi'),
]);

// ── Upload schemas ───────────────────────────────────────────────────────────

/** getUploadUrls: { wa, folder, files[] } */
export const uploadUrls = z.object({
  wa: waField,
  folder: z.string().min(1, 'Folder harus diisi').max(200, 'Folder terlalu panjang'),
  files: z.array(z.string().min(1)).min(1, 'Minimal 1 file'),
});

// ── Export all schemas ───────────────────────────────────────────────────────

export const schemas = {
  adminMasterPin,
  adminPersonalPin,
  refreshToken,
  kandidatLogin,
  kandidatRegister,
  gantiPassword,
  masterByWa,
  hapusJadwal,
  setTugasStatus,
  uploadUrls,
} as const;

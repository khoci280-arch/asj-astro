/**
 * schemas.ts — Zod validation schemas for all forms
 * Per PDF Fase 9: "Create strict Zod validation schemas"
 *
 * Validates data BEFORE sending to backend.
 * Prevents bad data (WA with letters, invalid email, etc.)
 */
import { z } from 'zod';

// ─── Candidate Registration / Login ───

/**
 * WA number — flexible format:
 * - Indonesia: 628xx (12-15 digit)
 * - Japan (+81): 81xx (10-15 digit)
 * - Internasional lain: 10-15 digit (tanpa spasi/simbol)
 */
export const waSchema = z.string()
  .regex(/^(\+?62|\+?81|\+?\d{1,3})\d{8,13}$/, 'Nomor WA tidak valid. Gunakan format 628xx (Indo) atau 81xx (Jepang), 10-15 digit');

/** Email (optional) */
export const emailSchema = z.string()
  .email('Format email tidak valid')
  .optional()
  .or(z.literal(''));

/** Password: 4-20 chars, no spaces */
export const passwordSchema = z.string()
  .min(4, 'Password minimal 4 karakter')
  .max(20, 'Password maksimal 20 karakter')
  .regex(/^\S+$/, 'Password tidak boleh mengandung spasi');

// ─── Candidate Profile ───

export const candidateProfileSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  gender: z.enum(['LAKI-LAKI', 'PEREMPUAN'], { errorMap: () => ({ message: 'Gender harus LAKI-LAKI atau PEREMPUAN' }) }),
  usia: z.number().min(16, 'Usia minimal 16 tahun').max(50, 'Usia maksimal 50 tahun'),
  tb: z.number().min(130, 'Tinggi minimal 130 cm').max(220, 'Tinggi maksimal 220 cm'),
  bb: z.number().min(35, 'Berat minimal 35 kg').max(150, 'Berat maksimal 150 kg'),
  email: emailSchema,
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
});

// ─── Kandidat Login ───

export const kandidatLoginSchema = z.object({
  wa: waSchema,
  password: passwordSchema,
});

// ─── Admin Login ───

export const adminMasterPinSchema = z.object({
  pin: z.string().min(1, 'PIN harus diisi'),
});

export const adminPersonalPinSchema = z.object({
  name: z.string().min(1, 'Nama admin harus diisi'),
  pin: z.string().min(1, 'PIN harus diisi'),
});

// ─── Registration ───

export const registerSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  wa: waSchema,
});

// ─── Type exports ───

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type KandidatLogin = z.infer<typeof kandidatLoginSchema>;
export type Register = z.infer<typeof registerSchema>;

// ─── Validation helper ───

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => e.message),
  };
}

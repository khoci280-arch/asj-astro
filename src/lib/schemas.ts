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
/**
 * Normalisasi WA — port KLIENT dari netlify/functions/shared/wa-rules.ts
 * (satu-satunya sumber kebenaran backend: auth/kandidat/mail/upload).
 * B01 fix: dulu klien punya aturan sendiri + regex RUSAK (/^8d{10,12}$/ —
 * huruf 'd' literal, bukan \\d) sehingga 8xx tanpa nol selalu ditolak;
 * sekarang aturan klien = aturan backend persis (Indonesia 628xx 12-15 digit,
 * Jepang 81xx 10-15 digit; 08xx→628, 090/070→81, 8xx→628, typo 6208→628).
 */
export function normalizeWaInput(v: string): string {
  let s = String(v || '').replace(/\D/g, '');
  if (!s) return '';
  if (s.startsWith('0')) {
    const second = s.charAt(1);
    if (second === '8') s = '62' + s.slice(1);
    else if (second === '9' || second === '7') s = '81' + s.slice(1);
    else if (s.length >= 12) s = '62' + s.slice(1);
    else return '';
  }
  // 6208 typo → 628
  if (s.startsWith('620') && s.charAt(3) === '8') s = '62' + s.slice(3);
  if (s.startsWith('628')) return s;
  if (s.startsWith('81') && /[890]/.test(s.charAt(2))) return s;
  if (s.startsWith('81')) {
    const third = s.charAt(2);
    if (third === '0' || third === '7' || third === '8' || third === '9') {
      if (s.length >= 12) return '62' + s;
      return s;
    }
    return '62' + s;
  }
  if (s.startsWith('8') && s.length >= 10) return '62' + s;
  return '';
}

/** Validasi format WA — mirror isValidWaFormat backend (ID 628xx 12-15, JP 81xx 10-15). */
function isWaValid(v: string): boolean {
  const n = normalizeWaInput(v);
  if (!n) return false;
  if (n.startsWith('628')) {
    const after = n.slice(3);
    return after.length >= 9 && after.length <= 12;
  }
  if (n.startsWith('81')) {
    const after = n.slice(2);
    return after.length >= 8 && after.length <= 12;
  }
  return false;
}

/** WA valid = kanonik Indonesia (628xx) atau Jepang (81xx) — parity backend. */
export const waSchema = z.string()
  .refine(isWaValid, 'Nomor WA tidak valid. Gunakan format 08xx/628xx (Indonesia) atau 090/070/080/81xx (Jepang).');

/** Email (optional) */
export const emailSchema = z.string()
  .email('Format email tidak valid')
  .optional()
  .or(z.literal(''));

/** Password: 4-20 chars, no spaces */
export const passwordSchema = z.string()
  .min(4, 'Password minimal 4 karakter')
  .max(20, 'Password maksimal 20 karakter')
  .regex(/^[^\s]+$/, 'Password tidak boleh mengandung spasi');

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

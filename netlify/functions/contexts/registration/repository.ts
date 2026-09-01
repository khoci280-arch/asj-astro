/**
 * contexts/registration/repository.ts — Database queries for student registration
 *
 * Owns: respon_siswa_baru
 * All DB access goes through kernel/http → supabaseJson
 */
import { normalizeGender, supabaseJson } from '../../_lib/db/client';

/** Get new student registrations (limited fields for safety) */
export async function getDaftarSiswaBaru(): Promise<any[]> {
  const rows = await supabaseJson('GET', 'respon_siswa_baru', {
    query: {
      select: 'id,nama_lengkap,jenis_kelamin,alamat_lengkap',
      limit: 500,
      order: 'created_at.desc',
    },
  });
  return Array.isArray(rows) ? rows : [];
}

/** Insert a new student registration */
export async function insertSiswaBaru(row: Record<string, any>): Promise<void> {
  await supabaseJson('POST', 'respon_siswa_baru', {
    body: row,
    headers: { Prefer: 'return=minimal' },
  });
}

export { normalizeGender };

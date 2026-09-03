/**
 * contexts/registry/service.ts — Business logic for candidate lifecycle
 *
 * Other contexts and surfaces import ONLY from index.ts.
 */
import { cacheClear } from '../../_lib/cache';
import { requireAdmin } from '../identity';
import { emit } from '../../_lib/kernel/events';
import { findCandidateByWa } from '../../_lib/candidate-helpers';
import { syncBiodataKeMail } from '../applications';
import { getCandidatesPage as getCandidatesPageRepo, patchCandidate } from './repository';

const SUPER_MAIL_LABELS: Record<string, string> = {
  gender: 'gender', usia: 'usia', tempat_lahir: 'tempat lahir', tgl_lahir: 'tgl lahir',
  tb: 'tinggi', bb: 'berat', nilai_jft_text: 'JFT', bidang_ssw_text: 'SSW', id_loker_pilihan: 'loker',
};

export async function handleUpdateCatatanKandidat(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  cacheClear();
  // Support both formats:
  // Legacy positional: [id, intNote, extNote, updatedAt]
  // Frontend object: [{ wa, catatan }]
  let id: string | number | undefined;
  let intNote = '';
  let updatedAt: string | undefined;
  const first = payload?.[0];
  if (first && typeof first === 'object') {
    // Frontend format: { wa, catatan }
    const data = first as Record<string, unknown>;
    const row = await findCandidateByWa(String(data.wa || ''));
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    id = row.id;
    intNote = String(data.catatan || '');
  } else {
    // Legacy positional format
    [id, intNote, , updatedAt] = (payload || []) as [string | number | undefined, string, unknown, string | undefined];
  }
  if (!id) return { success: false, error: 'ID kandidat tidak ditemukan.' };
  try {
    await patchCandidate(String(id), { catatan_admin: intNote || '' }, updatedAt, sessionToken);
    return { success: true };
  } catch (e: unknown) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes('412') || msg.includes('Precondition')) {
      return { success: false, error: 'Data telah diubah oleh pengguna lain. Silakan segarkan halaman.', conflict: true };
    }
    return { success: false, error: 'Gagal simpan catatan: ' + msg };
  }
}

export async function handleUpdateKandidatSuper(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  cacheClear();
  const data = ((payload && payload[0]) || {}) as Record<string, unknown>;
  if (!data.wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
  const updatedAt = data.updated_at as string | undefined;
  const body: Record<string, any> = {
    gender: data.gender !== undefined ? data.gender : undefined,
    usia: data.usia !== undefined ? data.usia : undefined,
    tempat_lahir: data.tempatLahir !== undefined ? data.tempatLahir : undefined,
    tgl_lahir: data.tglLahir !== undefined ? data.tglLahir : undefined,
    tb: data.tb !== undefined ? data.tb : undefined,
    bb: data.bb !== undefined ? data.bb : undefined,
    nilai_jft_text: data.jftText !== undefined ? data.jftText : undefined,
    bidang_ssw_text: data.sswText !== undefined ? data.sswText : undefined,
    id_loker_pilihan: data.idLoker !== undefined && data.idLoker !== null ? String(data.idLoker).trim() : undefined,
    tahapan_seleksi: data.tahapan !== undefined ? data.tahapan : undefined,
    status_kandidat: data.status !== undefined ? data.status : undefined,
  };
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  try {
    const row = await findCandidateByWa(data.wa as string);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const { normalizeWa } = await import('./repository');
    await patchCandidate(row.id, body, updatedAt, sessionToken);

    // Emit stage-changed event if status_kandidat was modified
    if (body.status_kandidat && String(body.status_kandidat) !== String(row.status_kandidat || '')) {
      emit({ type: 'candidate.stageChanged', wa: data.wa as string, from: String(row.status_kandidat || ''), to: String(body.status_kandidat), at: new Date().toISOString() });
    }
    try {
      const labels: string[] = [];
      for (const k of Object.keys(body)) {
        const label = SUPER_MAIL_LABELS[k];
        if (!label) continue;
        const oldVal = row[k] !== undefined && row[k] !== null ? String(row[k]).trim() : '';
        const newVal = String(body[k] === null || body[k] === undefined ? '' : body[k]).trim();
        if (newVal !== oldVal) labels.push(label);
      }
      if (labels.length) {
        await syncBiodataKeMail(data.wa as string, String(row.nama_lengkap || row.nama || 'KANDIDAT'), labels, sessionToken);
      }
    } catch { /* sync mail is best-effort */ }
    return { success: true };
  } catch (e: unknown) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes('412') || msg.includes('Precondition')) {
      return { success: false, error: 'Data telah diubah oleh pengguna lain. Silakan segarkan halaman.', conflict: true };
    }
    return { success: false, error: 'Gagal update kandidat: ' + msg };
  }
}

export async function handleGetCandidatesPage(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const opts = ((payload && payload[0]) || {}) as Record<string, unknown>;
  try {
    const { candidates, total } = await getCandidatesPageRepo({
      q: (opts.q || '') as string,
      page: Number(opts.page) || 1,
      pageSize: Number(opts.pageSize) || 50,
    });
    return { success: true, candidates, total };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal memuat kandidat: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

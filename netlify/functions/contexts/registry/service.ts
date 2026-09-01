/**
 * contexts/registry/service.ts — Business logic for candidate lifecycle
 *
 * Other contexts and surfaces import ONLY from index.ts.
 */
import { cacheClear } from '../../_lib/cache';
import { requireAdmin } from '../identity';
import { findCandidateByWa } from '../../_lib/candidate-helpers';
import { syncBiodataKeMail } from '../applications';
import { getCandidatesPage as getCandidatesPageRepo, patchCandidate } from './repository';

const SUPER_MAIL_LABELS: Record<string, string> = {
  gender: 'gender', usia: 'usia', tempat_lahir: 'tempat lahir', tgl_lahir: 'tgl lahir',
  tb: 'tinggi', bb: 'berat', nilai_jft_text: 'JFT', bidang_ssw_text: 'SSW', id_loker_pilihan: 'loker',
};

export async function handleUpdateCatatanKandidat(payload: any[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  cacheClear();
  const [id, intNote, extNote] = payload || [];
  if (!id) return { success: false, error: 'ID kandidat tidak ditemukan.' };
  try {
    await patchCandidate(String(id), { catatan_internal: intNote || '', catatan_external: extNote || '' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Gagal simpan catatan: ' + e.message };
  }
}

export async function handleUpdateKandidatSuper(payload: any[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  cacheClear();
  const data = (payload && payload[0]) || {};
  if (!data.wa) return { success: false, error: 'Nomor WA tidak ditemukan.' };
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
  };
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  try {
    const row = await findCandidateByWa(data.wa);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const { normalizeWa } = await import('../../_lib/db/client');
    await patchCandidate(row.id, body);
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
        await syncBiodataKeMail(data.wa, String(row.nama_lengkap || row.nama || 'KANDIDAT'), labels);
      }
    } catch { /* sync mail is best-effort */ }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: 'Gagal update kandidat: ' + e.message };
  }
}

export async function handleGetCandidatesPage(payload: any[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const opts = (payload && payload[0]) || {};
  try {
    const { candidates, total } = await getCandidatesPageRepo({
      q: opts.q || '',
      page: Number(opts.page) || 1,
      pageSize: Number(opts.pageSize) || 50,
    });
    return { success: true, candidates, total };
  } catch (e: any) {
    return { success: false, error: 'Gagal memuat kandidat: ' + e.message };
  }
}

/**
 * contexts/jobs/service.ts — Business logic for job_database CRUD
 */
import { requireAdmin } from '../identity';
import {
  hasBackend, mapJobPayloadToRow, nextJobCode, getJobMapped,
  patchJob, deleteJob, postJob, normalizeWa, pick, toText, mapCandidate, stripRaw,
  findCandidateByWa, cacheClear, findFormsByWa, findForms, mapForm,
  attachBerkasBio, countCandidatesForJob, findCandidates, supabaseJson,
} from './repository';

export async function handleSimpanJobBaru(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const data = (payload && payload[0]) || {};
  if (!data.pekerjaan) return { success: false, error: 'Nama pekerjaan wajib diisi.' };
  if (!hasBackend()) return { success: false, error: 'Backend belum dikonfigurasi.' };
  try {
    const code = await nextJobCode();
    await postJob({ code_job: code, ...mapJobPayloadToRow(data) });
    return { success: true, code };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal simpan loker: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleEditLokerFull(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const data = (payload && payload[0]) || {};
  if (!data.code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  if (!hasBackend()) return { success: false, error: 'Backend belum dikonfigurasi.' };
  try {
    const body = mapJobPayloadToRow(data);
    for (const k of Object.keys(body)) {
      if (k !== 'dokumen_share' && (body[k] === '' || body[k] === '-')) delete body[k];
    }
    await patchJob(data.code, body, data.updated_at, sessionToken);
    return { success: true };
  } catch (e: unknown) {
    const msg = String((e instanceof Error ? e.message : String(e)) || e);
    if (msg.includes('412') || msg.includes('Precondition')) {
      return { success: false, error: 'Data telah diubah oleh pengguna lain. Silakan segarkan halaman.', conflict: true };
    }
    return { success: false, error: 'Gagal edit loker: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleUbahStatusJob(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const [code, status, updatedAt] = payload || [];
  if (!code || !status) return { success: false, error: 'Data tidak lengkap.' };
  try {
    await patchJob(code, { status }, updatedAt, sessionToken);
    return { success: true, job: await getJobMapped(code) };
  } catch (e: unknown) {
    const msg = String((e instanceof Error ? e.message : String(e)) || e);
    if (msg.includes('412') || msg.includes('Precondition')) {
      return { success: false, error: 'Data telah diubah oleh pengguna lain. Silakan segarkan halaman.', conflict: true };
    }
    return { success: false, error: 'Gagal ubah status: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleHapusJobData(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const [code] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  try {
    const adaTerkait = await countCandidatesForJob(code);
    if (adaTerkait === true) {
      return { success: false, error: 'Gagal hapus loker. Mungkin masih ada kandidat terkait.' };
    }
    if (adaTerkait === undefined) {
      const cands = await findCandidates();
      const terkait = cands.rows.some((r) => String(r.id_loker_pilihan || '') === String(code));
      if (terkait) return { success: false, error: 'Gagal hapus loker. Mungkin masih ada kandidat terkait.' };
    }
    await deleteJob(code);
    return { success: true, code };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal hapus loker: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleUpdateTahapanDbJob(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const [code, tahapan, status] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  const body: Record<string, unknown> = {};
  if (tahapan !== undefined && tahapan !== null) body.tahapan = tahapan;
  if (status !== undefined && status !== null) body.status = status;
  try {
    await patchJob(code, body, undefined, sessionToken);
    return { success: true, job: await getJobMapped(code) };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal update tahapan: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleUpdateDokumenShare(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const [code, joined] = payload || [];
  if (!code) return { success: false, error: 'Kode loker tidak ditemukan.' };
  try {
    await patchJob(code, { dokumen_share: joined || '' }, undefined, sessionToken);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal update dokumen: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export async function handleTandaiGagalJob(payload: unknown[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const [wa, jobCode] = payload || [];
  if (!wa || !jobCode) return { success: false, error: 'Data tidak lengkap.' };
  cacheClear();
  try {
    const row = await findCandidateByWa(wa);
    if (!row) return { success: false, error: 'Kandidat tidak ditemukan.' };
    const idLoker = toText(pick(row, ['id_loker_pilihan', 'id_loker']));
    if (String(idLoker) !== String(jobCode)) {
      return { success: false, error: 'Kandidat tidak terdaftar di job ini.' };
    }
    await supabaseJson('PATCH', 'database_candidate', {
      query: { id: 'eq.' + row.id },
      body: { status_kandidat: 'GAGAL', id_loker_pilihan: null, updated_at: new Date().toISOString() },
      headers: { Prefer: 'return=minimal' },
    });
    let formUpdated: Record<string, unknown> | null = null;
    try {
      let forms = await findFormsByWa(wa);
      if (forms === undefined) forms = await findForms();
      const want = normalizeWa(wa);
      const m = forms.find((r) => normalizeWa(String(r.no_wa || '')) === want) || null;
      if (m && m.id !== undefined) {
        await supabaseJson('PATCH', 'database_asj_form', {
          query: { id: 'eq.' + m.id },
          body: { status: 'GAGAL' },
          headers: { Prefer: 'return=minimal' },
        });
        m.status = 'GAGAL';
        formUpdated = mapForm(m, -1);
      }
    } catch { /* opsional */ }
    let candidate: Record<string, unknown> | null = null;
    try {
      const row2 = await findCandidateByWa(wa);
      if (row2 && row2.id !== undefined) {
        candidate = stripRaw([mapCandidate(row2)])[0] || null;
        if (candidate) { try { await attachBerkasBio([candidate]); } catch { /* best-effort */ } }
      }
    } catch { /* best-effort */ }
    return { success: true, candidate, form: formUpdated };
  } catch (e: unknown) {
    return { success: false, error: 'Gagal tandai gagal: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

/**
 * contexts/jobs/repository.ts — Database queries for job_database CRUD
 *
 * Owns: job_database
 */
import { hasBackend, normalizeWa, pick, supabaseJson, toText } from '../../_lib/db/client';
import { clientFor } from '../../_lib/kernel/db';
import { findForms, findFormsByWa, mapForm } from '../../_lib/db/forms';
import { findCandidates, mapCandidate } from '../../_lib/db/candidates';
import { attachBerkasBio } from '../../_lib/db/berkas';
import { findCandidateByWa } from '../../_lib/candidate-helpers';
import { cacheClear } from '../../_lib/cache';
import { stripRaw } from '../catalog';
import {
  countCandidatesForJob, findJobByCodeFiltered, findJobs, mapJob, maxJobCodeNumber,
} from '../../_lib/db/jobs';

const JOB_COLUMNS: Record<string, string> = {
  tsk: 'tsk', kategori: 'kategori', pekerjaan: 'pekerjaan', lokasi: 'lokasi',
  gender: 'gender', templateCv: 'format_cv', status: 'status', kuota: 'kuota',
  jmlKandidat: 'jumlah_kandidat', syarat: 'syarat', keterangan: 'keterangan',
  pamflet: 'link_pamflet', tahapanDB: 'tahapan', totalBiaya: 'total_biaya',
  rincianBiaya: 'rincian_biaya', dokumenShare: 'dokumen_share',
};

export function mapJobPayloadToRow(data: any): Record<string, any> {
  const row: Record<string, any> = {};
  for (const [from, to] of Object.entries(JOB_COLUMNS)) {
    if (data[from] !== undefined && data[from] !== null) row[to] = data[from];
  }
  return row;
}

export async function nextJobCode(): Promise<string> {
  const fastMax = await maxJobCodeNumber();
  if (fastMax !== undefined) return 'TG' + (fastMax + 1) + 'ASJ';
  const found = await findJobs();
  let max = 0;
  for (const row of found.rows) {
    const m = String(row.code_job || row.code || '').match(/TG(\d+)ASJ/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'TG' + (max + 1) + 'ASJ';
}

export async function getJobMapped(code: string): Promise<any | null> {
  let row: any = await findJobByCodeFiltered(code);
  if (row === undefined) {
    const found = await findJobs();
    row = (found.rows || []).find((r) => String(r.code_job || r.code || '') === String(code)) || null;
  }
  if (!row) return null;
  return stripRaw([mapJob(row)])[0] || null;
}

export async function patchJob(code: string, body: Record<string, any>, updatedAt?: string, sessionToken?: string): Promise<void> {
  const headers: Record<string, string> = { Prefer: 'return=minimal' };
  if (updatedAt) headers['If-Match'] = '"' + updatedAt + '"';
  const client = clientFor('jobs.patchJob', sessionToken);
  await supabaseJson('PATCH', 'job_database', {
    query: { code_job: 'eq.' + code },
    body,
    headers,
    overrideKey: client.apikey,
    overrideAuthKey: client.authKey,
  } as any);
}

export async function deleteJob(code: string): Promise<void> {
  await supabaseJson('DELETE', 'job_database', {
    query: { code_job: 'eq.' + code },
    headers: { Prefer: 'return=minimal' },
  });
}

export async function postJob(body: Record<string, any>): Promise<void> {
  await supabaseJson('POST', 'job_database', {
    body,
    headers: { Prefer: 'return=minimal' },
  });
}

export { hasBackend, normalizeWa, pick, toText, mapCandidate, stripRaw,
  findCandidateByWa, cacheClear, findFormsByWa, findForms, mapForm,
  attachBerkasBio, countCandidatesForJob, findCandidates, supabaseJson };

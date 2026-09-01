/**
 * contexts/registry/repository.ts — Database queries for candidate lifecycle
 *
 * Owns: database_candidate (lifecycle), master_database_candidate (read)
 * All DB access goes through kernel/http → supabaseJson
 */
import { normalizeWa, supabaseJson } from '../../_lib/db/client';
import { clientFor } from '../../_lib/kernel/db';
import { mapCandidate } from '../../_lib/db/candidates';
import { findForms, findFormsByWaList } from '../../_lib/db/forms';
import { attachBerkasBio } from '../../_lib/db/berkas';
import { attachApplications } from '../../_lib/db/candidates';
import { stripRaw, loadCandidatesUnik } from '../catalog';

export async function getCandidatesPage(opts: any): Promise<{ candidates: any[]; total: number }> {
  const { rows: candRows, total } = await loadCandidatesUnik(opts.q || '', {
    page: opts.page || 1,
    pageSize: opts.pageSize || 50,
  });
  const cands = stripRaw(candRows.map(mapCandidate));
  const waList = cands.map((c) => normalizeWa(String(c.wa || ''))).filter(Boolean);
  let allForms: any;
  await Promise.all([
    attachBerkasBio(cands),
    findFormsByWaList(waList).then((r) => { allForms = r; }),
  ]);
  if (allForms === undefined) allForms = await findForms();
  attachApplications(cands, allForms);
  return { candidates: cands, total };
}

export async function patchCandidate(id: string, body: Record<string, any>, updatedAt?: string, sessionToken?: string): Promise<void> {
  const headers: Record<string, string> = { Prefer: 'return=minimal' };
  if (updatedAt) headers['If-Match'] = '"' + updatedAt + '"';
  const client = clientFor('registry.patchCandidate', sessionToken);
  await supabaseJson('PATCH', 'database_candidate', {
    query: { id: 'eq.' + id },
    body,
    headers,
    overrideKey: client.apikey,
    overrideAuthKey: client.authKey,
  } as any);
}

export { normalizeWa, supabaseJson };

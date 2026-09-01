/**
 * contexts/ingestion/repository.ts — Database queries for document parsing + upsert
 *
 * Owns: parse results, master_database_candidate upsert
 */
import {
  normalizeWa, normalizeGender, pick, supabaseJson, supabaseUpsert, toText,
} from '../../_lib/db/client';
import { cacheClear } from '../../_lib/cache';

export async function findMasterByWa(wa: string): Promise<any | null> {
  const want = normalizeWa(wa);
  const rows = await supabaseJson('GET', 'master_database_candidate', {
    query: { select: '*', no_wa: 'eq.' + want, limit: 1 },
  });
  const arr = Array.isArray(rows) ? rows : [];
  return arr.find((r: any) => normalizeWa(String(r.no_wa || '')) === want) || null;
}

export async function patchMaster(id: string, body: Record<string, any>): Promise<any> {
  return supabaseJson('PATCH', 'master_database_candidate', {
    query: { id: 'eq.' + id },
    body,
    headers: { Prefer: 'return=representation' },
  });
}

export async function upsertMaster(body: Record<string, any>): Promise<any> {
  return supabaseUpsert('master_database_candidate', body, ['no_wa'], {
    headers: { Prefer: 'return=representation' },
  });
}

export async function nextCandidateId(): Promise<string> {
  const { nextCandidateId: ncid } = await import('../../_lib/candidate-helpers');
  return ncid();
}

export { normalizeWa, normalizeGender, cacheClear };

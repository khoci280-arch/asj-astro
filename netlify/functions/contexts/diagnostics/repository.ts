/**
 * contexts/diagnostics/repository.ts — Database queries for health check
 *
 * Owns: schema introspection
 */
import { findJobs } from '../../_lib/db/jobs';
import { findCandidates } from '../../_lib/db/candidates';
import { findAdmins, findSettings } from '../../_lib/db/misc';
import {
  columnsFromSchema, hasBackend, supabaseJson, supabaseUrl,
  tablesFromSchema, toText,
} from '../../_lib/db/client';

export async function getTableInfo() {
  if (!hasBackend()) return null;
  const url = supabaseUrl();
  const urlFormat = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ? 'ok' : 'tidak valid';
  let reachable = false;
  let error: string | null = null;
  let names: string[] = [];
  let columns: Record<string, string[]> = {};
  try {
    const spec = await supabaseJson('GET', '', {} as Record<string, unknown>);
    reachable = true;
    names = tablesFromSchema(spec);
    for (const name of names) columns[name] = columnsFromSchema(spec, name);
  } catch (e: unknown) { error = String((e instanceof Error ? e.message : String(e)) || e).slice(0, 300); }
  return { urlFormat, reachable, error, all: names, columns };
}

export async function getJobInfo() {
  const jobs = await findJobs();
  return {
    exists: jobs.table,
    columns: jobs.rows[0] ? Object.keys(jobs.rows[0]) : null,
    statusSamples: [...new Set(jobs.rows.slice(0, 20).map((r) => 'status=' + toText(r.status) + ' | tahapan=' + toText(r.tahapan)))].slice(0, 8),
    statusAll: [...new Set(jobs.rows.map((r) => toText(r.status)))].slice(0, 15),
  };
}

export async function getCandidateInfo() {
  const cands = await findCandidates();
  const pw = cands.rows[0]?.password_kandidat ?? cands.rows[0]?.password ?? null;
  return {
    exists: cands.table,
    columns: cands.rows[0] ? Object.keys(cands.rows[0]) : null,
    passwordFormat: pw == null ? 'kosong' : typeof pw === 'string' && pw.startsWith('$2') ? 'bcrypt' : 'plaintext',
    passwordChanged: cands.rows[0]?.password_diubah ?? null,
  };
}

export async function getAdminInfo() {
  const admins = await findAdmins();
  return { exists: admins.table, columns: admins.rows[0] ? Object.keys(admins.rows[0]) : null };
}

export async function getSettingsInfo() {
  const settings = await findSettings();
  return {
    exists: settings.table,
    columns: settings.rows[0] ? Object.keys(settings.rows[0]) : null,
    configTypes: [...new Set(settings.rows.map((r) => toText(r.config_type)))].slice(0, 30),
  };
}

export { hasBackend };

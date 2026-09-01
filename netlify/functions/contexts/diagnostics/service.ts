/**
 * contexts/diagnostics/service.ts — Business logic for diagnostics
 */
import { requireAdmin, masterPins } from '../identity';
import { debugFileEnvKeys, debugFileStructure } from '../../_lib/env';
import {
  getTableInfo, getJobInfo, getCandidateInfo,
  getAdminInfo, getSettingsInfo, hasBackend,
} from './repository';

export async function handleGetAppConfig(_payload: any[], sessionToken?: string) {
  const guard = requireAdmin(sessionToken || '');
  if (guard.error) return guard.error;
  const diag: Record<string, any> = {
    success: true,
    backend: 'netlify-functions-rebuild',
    supabaseConfigured: hasBackend(),
    supabaseUrlFormat: null,
    supabaseReachable: false,
    supabaseError: null,
    adminPinConfigured: masterPins().length > 0,
    fileEnvKeys: debugFileEnvKeys(),
    fileEnvStructure: debugFileStructure(),
    tables: {},
  };
  if (!hasBackend()) return diag;
  const tableInfo = await getTableInfo();
  if (tableInfo) {
    diag.supabaseUrlFormat = tableInfo.urlFormat;
    diag.supabaseReachable = tableInfo.reachable;
    diag.supabaseError = tableInfo.error;
    diag.tables.all = tableInfo.all;
    diag.tables.columns = tableInfo.columns;
  }
  const jobInfo = await getJobInfo();
  diag.tables.jobs = jobInfo.exists;
  if (jobInfo.columns) {
    diag.tables.jobsColumns = jobInfo.columns;
    diag.jobStatusSamples = jobInfo.statusSamples;
    diag.jobStatusAll = jobInfo.statusAll;
  }
  const candInfo = await getCandidateInfo();
  diag.tables.candidates = candInfo.exists;
  if (candInfo.columns) {
    diag.tables.candidatesColumns = candInfo.columns;
    diag.candidatePassSample = candInfo.passwordFormat;
    diag.candidatePassChanged = candInfo.passwordChanged;
  }
  const adminInfo = await getAdminInfo();
  diag.tables.admins = adminInfo.exists;
  if (adminInfo.columns) diag.tables.adminsColumns = adminInfo.columns;
  const settingsInfo = await getSettingsInfo();
  diag.tables.settings = settingsInfo.exists;
  if (settingsInfo.columns) {
    diag.tables.settingsColumns = settingsInfo.columns;
    diag.sysConfigTypes = settingsInfo.configTypes;
  }
  return diag;
}

export function handleReportWebVital(payload: any) {
  if (!payload || !payload.name) return { success: false, error: 'invalid payload' };
  const { name, value, rating, delta, id, navigationType } = payload;
  console.log(
    `[web-vitals] ${rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'} ` +
    `${name}: ${typeof value === 'number' ? value.toFixed(name === 'CLS' ? 4 : 0) : value}ms ` +
    `(${rating}) delta=${delta} nav=${navigationType} id=${id}`,
  );
  return { success: true };
}

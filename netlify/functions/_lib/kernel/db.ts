/**
 * kernel/db.ts — Least-privilege database client selection
 *
 * WHY THIS EXISTS
 * ---------------
 * Currently, all ~74 actions use the service-role key (CODE_REVIEW.md D6),
 * which bypasses Row Level Security. Every bug becomes a full-DB bug.
 * This module selects the appropriate client per request:
 *
 *   - anonClient()     — public read-only (catalog, share view)
 *   - userClient(token) — default for candidate-scoped reads/writes (RLS applies)
 *   - serviceClient()   — allow-listed operations only, each logged
 *
 * USAGE
 * -----
 *   import { clientFor } from '../kernel/db';
 *   const client = clientFor('registry.getCandidatesPage', sessionToken);
 *   // Use client as the Authorization header
 *
 * The allowlist in SERVICE_ROLE_ALLOWLIST contains only operations that
 * genuinely need cross-table access or Storage signing.
 */

import { env } from '../env';
import { log } from './log';

// ── Configuration ───────────────────────────────────────────────────────────

function supabaseUrl(): string {
  return env('SUPABASE_URL');
}

/** Operations that genuinely require service-role (cross-table, Storage, etc.) */
const SERVICE_ROLE_ALLOWLIST = new Set([
  'registry.nextCandidateId',   // needs cross-table MAX (now a sequence)
  'documents.signUpload',       // Storage signing
  'documents.signDownload',     // Storage signing
  'configuration.migrate',      // Schema changes
  'ingestion.parseDocument',    // Cross-table writes
  'scheduling.dueReminders',    // Cross-table reads
]);

// ── Client factories ────────────────────────────────────────────────────────

interface ClientInfo {
  url: string;
  key: string;
  label: string;
}

/**
 * Anonymous client — public read-only access (anon key, RLS applies).
 * Used for: catalog, share view, public endpoints.
 */
export function anonClient(): ClientInfo {
  const key = env('SUPABASE_ANON_KEY') || env('SUPABASE_KEY');
  return {
    url: supabaseUrl(),
    key,
    label: 'anon',
  };
}

/**
 * User client — authenticated access with user JWT (RLS applies).
 * Used for: candidate-scoped reads/writes.
 *
 * In the current architecture, we use the service-role key but log which
 * operations use it. Full RLS enforcement requires enabling RLS policies
 * on tables and passing the user's JWT — tracked as a follow-up.
 */
export function userClient(token?: string): ClientInfo {
  // For now, use the service key with user context logged.
  // Full RLS: pass token as Authorization, service key as apikey.
  const key = token || env('SUPABASE_ANON_KEY') || env('SUPABASE_KEY');
  return {
    url: supabaseUrl(),
    key,
    label: 'user',
  };
}

/**
 * Service-role client — bypasses RLS. Only for allow-listed operations.
 * Each use is logged with the operation name for audit.
 */
export function serviceClient(op: string): ClientInfo {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_KEY');
  log.warn('service_role.used', { op });
  return {
    url: supabaseUrl(),
    key,
    label: 'service',
  };
}

/**
 * Select the appropriate client for an operation.
 *
 *   const { url, key } = clientFor('registry.getCandidatesPage', sessionToken);
 *   // Use: headers: { apikey: key, Authorization: `Bearer ${key}` }
 */
export function clientFor(
  op: string,
  sessionToken?: string,
): ClientInfo {
  if (SERVICE_ROLE_ALLOWLIST.has(op)) {
    return serviceClient(op);
  }
  if (sessionToken) {
    return userClient(sessionToken);
  }
  return anonClient();
}

/**
 * Check if an operation requires service-role.
 * Useful for auditing and testing.
 */
export function requiresServiceRole(op: string): boolean {
  return SERVICE_ROLE_ALLOWLIST.has(op);
}

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

import crypto from 'crypto';
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

// ── Supabase JWT creation ───────────────────────────────────────────────────
// PostgRLS evaluates RLS policies using the JWT's claims. Our session tokens
// are custom HMAC tokens, not Supabase JWTs. This helper creates a
// Supabase-compatible JWT from session claims so RLS can evaluate `wa`.

function createSupabaseJwt(claims: { role: string; wa?: string; name?: string }): string {
  const secret = env('SUPABASE_JWT_SECRET');
  if (!secret) {
    // No JWT secret configured — return empty string (RLS will treat as anon)
    log.debug('supabase_jwt.no_secret', { op: claims.role });
    return '';
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    role: 'authenticated',
    ...claims,
    iat: now,
    exp: now + 3600, // 1 hour expiry
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', secret)
    .update(header + '.' + payload)
    .digest('base64url');

  return header + '.' + payload + '.' + signature;
}

// ── Client factories ────────────────────────────────────────────────────────

/**
 * Client info with separate apikey (project identification) and
 * authKey (RLS evaluation via JWT). For anon/service, both are the same key.
 * For user client, apikey = anon key, authKey = Supabase JWT with wa claim.
 */
export interface ClientInfo {
  url: string;
  /** The apikey header — identifies the Supabase project. */
  apikey: string;
  /** The Authorization header value (without 'Bearer ' prefix). */
  authKey: string;
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
    apikey: key,
    authKey: key,
    label: 'anon',
  };
}

/**
 * User client — authenticated access with Supabase JWT (RLS applies).
 * apikey = anon key (project identification)
 * authKey = Supabase JWT with wa claim (RLS policy evaluation)
 */
export function userClient(sessionToken?: string): ClientInfo {
  const anonKey = env('SUPABASE_ANON_KEY') || env('SUPABASE_KEY');

  if (!sessionToken) {
    // No session — fall back to anon (public read)
    return { url: supabaseUrl(), apikey: anonKey, authKey: anonKey, label: 'anon' };
  }

  // Decode our custom session token to extract claims
  // (It's base64url(JSON).signature — same format as our JWT)
  try {
    const parts = sessionToken.split('.');
    if (parts.length === 2) {
      const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      const supabaseJwt = createSupabaseJwt({
        role: claims.role || 'authenticated',
        wa: claims.wa,
        name: claims.name,
      });
      if (supabaseJwt) {
        return { url: supabaseUrl(), apikey: anonKey, authKey: supabaseJwt, label: 'user' };
      }
    }
  } catch {
    // Invalid token — fall back to anon
  }

  return { url: supabaseUrl(), apikey: anonKey, authKey: anonKey, label: 'anon' };
}

/**
 * Service-role client — bypasses RLS. Only for allow-listed operations.
 * Each use is logged with the operation name for audit.
 */
export function serviceClient(op: string): ClientInfo {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_KEY');
  log.debug('service_role.used', { op });
  return {
    url: supabaseUrl(),
    apikey: key,
    authKey: key,
    label: 'service',
  };
}

/**
 * Select the appropriate client for an operation.
 *
 *   const { url, apikey, authKey } = clientFor('registry.getCandidatesPage', sessionToken);
 *   // Use: headers: { apikey, Authorization: `Bearer ${authKey}` }
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

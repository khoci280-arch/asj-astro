/**
 * surfaces/auth.ts — Auth surface (narrow registry)
 *
 * One of 8 deployment surfaces. Handles only identity-related actions:
 *   checkAdminMaster, checkAdminPersonal, refreshAdminSession,
 *   loginKandidat, refreshKandidatSession, daftarKandidat,
 *   gantiPasswordKandidat, registerFcmToken
 *
 * This surface imports ONLY from contexts/identity — never from other
 * contexts or from _lib/ directly (except kernel utilities).
 *
 * MIGRATION NOTE:
 *   This surface is currently a thin wrapper. The old actions-auth.ts
 *   remains as the dispatcher entry point until all surfaces are extracted.
 *   After Phase 4, the dispatcher routes directly to surface registries.
 */

import { validatePayload, schemas } from '../_lib/kernel/validate';
import { normalizeWa } from '../shared/wa-rules';
import * as identity from '../contexts/identity';
import * as session from '../_lib/session';
import { supabaseJson } from '../_lib/db/client';

/**
 * Surface registry: action name → handler function.
 * Used by the dispatcher to route requests.
 */
export const AUTH_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  checkAdminMaster: async (payload) => {
    const [pin] = validatePayload(payload, schemas.adminMasterPin);
    return identity.checkAdminMaster(pin);
  },

  checkAdminPersonal: async (payload) => {
    const [name, pin] = validatePayload(payload, schemas.adminPersonalPin);
    return identity.checkAdminPersonal(name, pin);
  },

  refreshAdminSession: async (payload) => {
    const [rt] = validatePayload(payload, schemas.refreshToken);
    return identity.refreshAdminSession(rt);
  },

  loginKandidat: async (payload) => {
    const [rawWa, password] = validatePayload(payload, schemas.kandidatLogin);
    const wa = normalizeWa(rawWa);
    return identity.loginKandidat(wa, password);
  },

  refreshKandidatSession: async (payload) => {
    const [rt] = validatePayload(payload, schemas.refreshToken);
    return identity.refreshKandidatSession(rt);
  },

  daftarKandidat: async (payload) => {
    const [nama, rawWa, password, usia] = validatePayload(payload, schemas.kandidatRegister);
    const wa = normalizeWa(rawWa);
    return identity.registerKandidat(nama, wa, password, usia);
  },

  gantiPasswordKandidat: async (payload, sessionToken) => {
    const [rawWa, lama, baru] = validatePayload(payload, schemas.gantiPassword);
    const wa = normalizeWa(rawWa);
    // Verify ownership
    if (!identity.isOwnerOrAdmin(sessionToken || '', wa)) {
      return { success: false, message: 'Akses ditolak.' };
    }
    return identity.changePassword(wa, lama, baru);
  },
};

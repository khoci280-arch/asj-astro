/**
 * surfaces/candidates.ts — Candidate management surface
 *
 * Handles: getCandidatesPage, updateCatatanKandidat
 * Auth: Admin only
 */
import * as registry from '../contexts/registry';

export const CANDIDATE_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getCandidatesPage: (payload, sessionToken) => registry.handleGetCandidatesPage(payload, sessionToken),
  updateCatatanKandidat: (payload, sessionToken) => registry.handleUpdateCatatanKandidat(payload, sessionToken),
  // Stub-only action — inlined to remove dead actions-candidate module.
  updateKandidatSuper: async () => ({ success: false, message: 'Fungsi ini belum diimplementasi di backend rebuild.' }),
};

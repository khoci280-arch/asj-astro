/**
 * surfaces/ingest.ts — Document ingestion surface
 *
 * parseDokumenBiodata (admin AI copilot upload CV/Excel/PDF) runs synchronously
 * through the real handler in _lib/ai/classify.ts — the same contract legacy
 * exposes (guard admin → extract JSON biodata → return { wa, data,
 * fieldCount, fileName, namaSekarang, riwayat }), so the frontend can follow
 * with submitMasterForm to persist. A previous refactor enqueued an
 * 'ingest.parse' background job whose worker was never implemented (NOT_IMPL),
 * making admin document parsing a silent dead end — the handler itself was
 * left orphaned in _lib/ai/classify.ts.
 */
import { handleParseDokumenBiodata } from '../_lib/ai/classify';

export const INGEST_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  parseDokumenBiodata: async (p: unknown[], s?: string) => handleParseDokumenBiodata(p, s),
};

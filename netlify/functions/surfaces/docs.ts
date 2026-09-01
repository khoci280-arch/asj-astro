/**
 * surfaces/docs.ts — Document upload/download surface
 *
 * Handles: getUploadUrls, cekDataPelamar
 * Auth: Required (session check already in handlers)
 */
import * as documents from '../contexts/documents';

const NOT_IMPL = { success: false, message: 'Fungsi ini belum diimplementasi di backend rebuild.' };

export const DOCS_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getUploadUrls: (payload, sessionToken) => documents.handleGetUploadUrls(payload, sessionToken),
  cekDataPelamar: (payload, sessionToken) => documents.handleCekDataPelamar(payload, sessionToken),
  // The actions below were stub-only (throw NOT_IMPLEMENTED). Inlined to
  // remove the dead actions-upload/actions-master/actions-download modules.
  isJobRequiresCv: async () => NOT_IMPL,
  submitApply: async () => NOT_IMPL,
  submitFormPelamar: async () => NOT_IMPL,
  getExistingCandidateJsonByWa: async () => NOT_IMPL,
  simpanBiodataLengkap: async () => NOT_IMPL,
  simpanKandidatDanUpload: async () => NOT_IMPL,
  simpanBerkasTahapan: async () => NOT_IMPL,
  simpanRevisiKandidat: async () => NOT_IMPL,
  downloadJobDocs: async () => NOT_IMPL,
};

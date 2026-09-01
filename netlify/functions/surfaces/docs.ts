/**
 * surfaces/docs.ts — Document upload/download surface
 *
 * Handles: getUploadUrls, cekDataPelamar
 * Auth: Required (session check already in handlers)
 */
import * as documents from '../contexts/documents';

export const DOCS_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getUploadUrls: (payload, sessionToken) => documents.handleGetUploadUrls(payload, sessionToken),
  cekDataPelamar: (payload, sessionToken) => documents.handleCekDataPelamar(payload, sessionToken),
  isJobRequiresCv: async (p, s) => {
    const { handleIsJobRequiresCv } = await import('../_lib/actions-upload');
    return handleIsJobRequiresCv(p, s);
  },
  submitApply: async (p, s) => {
    const { handleSubmitApply } = await import('../_lib/actions-upload');
    return handleSubmitApply(p, s);
  },
  submitFormPelamar: async (p, s) => {
    const { handleSubmitApply } = await import('../_lib/actions-upload');
    return handleSubmitApply(p, s);
  },
  getExistingCandidateJsonByWa: async (p, s) => {
    const { handleGetExistingCandidateJsonByWa } = await import('../_lib/actions-upload');
    return handleGetExistingCandidateJsonByWa(p, s);
  },
  simpanBiodataLengkap: async (p, s) => {
    const { handleSubmitMasterForm } = await import('../_lib/actions-master');
    return handleSubmitMasterForm(p, s);
  },
  simpanKandidatDanUpload: async (p, s) => {
    const { handleSimpanKandidatDanUpload } = await import('../_lib/actions-upload');
    return handleSimpanKandidatDanUpload(p, s);
  },
  simpanBerkasTahapan: async (p, s) => {
    const { handleSimpanBerkasTahapan } = await import('../_lib/actions-upload');
    return handleSimpanBerkasTahapan(p, s);
  },
  simpanRevisiKandidat: async (p, s) => {
    const { handleSimpanRevisiKandidat } = await import('../_lib/actions-upload');
    return handleSimpanRevisiKandidat(p, s);
  },
  downloadJobDocs: async (p, s) => {
    const { handleDownloadJobDocs } = await import('../_lib/actions-download');
    return handleDownloadJobDocs(p, s);
  },
};

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
};

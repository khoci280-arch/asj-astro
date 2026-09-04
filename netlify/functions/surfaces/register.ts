/**
 * surfaces/register.ts — Registration surface (public + admin)
 */
import * as registration from '../contexts/registration';
export const REGISTER_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getDaftarSiswaBaru: (p, s) => registration.handleGetDaftarSiswaBaru(p, s),
  // Legacy clients send the payload OBJECT (not wrapped in an array) —
  // normalize both shapes.
  submitDaftarSiswa: (p) => registration.handleSubmitDaftarSiswa(Array.isArray(p) ? (p && p[0]) : p),
  getLinkSiswaBaru: () => registration.handleGetLinkSiswaBaru(),
  generateFormBridge: (p) => registration.handleGenerateFormBridge(p),
  generateLegacyMasterBridge: (p, s) => registration.handleGenerateLegacyMasterBridge(p, s),
  generateAiFormBridge: (p, s) => registration.handleGenerateAiFormBridge(p, s),
};

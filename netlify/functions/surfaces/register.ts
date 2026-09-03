/**
 * surfaces/register.ts — Registration surface (public + admin)
 */
import * as registration from '../contexts/registration';
export const REGISTER_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getDaftarSiswaBaru: (p, s) => registration.handleGetDaftarSiswaBaru(p, s),
  submitDaftarSiswa: (p) => registration.handleSubmitDaftarSiswa(p),
  getLinkSiswaBaru: () => registration.handleGetLinkSiswaBaru(),
  generateFormBridge: (p) => registration.handleGenerateFormBridge(p),
  generateLegacyMasterBridge: (p) => registration.handleGenerateLegacyMasterBridge(p),
  generateAiFormBridge: (p) => registration.handleGenerateAiFormBridge(p),
};

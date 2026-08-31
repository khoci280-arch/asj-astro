/**
 * surfaces/register.ts — Registration surface (public + admin)
 */
import * as registration from '../contexts/registration';
export const REGISTER_ACTIONS: Record<string, Function> = {
  getDaftarSiswaBaru: (p, s) => registration.handleGetDaftarSiswaBaru(p, s),
  submitDaftarSiswa: (p) => registration.handleSubmitDaftarSiswa(p),
  getLinkSiswaBaru: () => registration.handleGetLinkSiswaBaru(),
  generateFormBridge: (p, s) => registration.handleGenerateFormBridge(p, s),
  generateLegacyMasterBridge: (p, s) => registration.handleGenerateLegacyMasterBridge(p, s),
  generateAiFormBridge: (p, s) => registration.handleGenerateAiFormBridge(p, s),
};

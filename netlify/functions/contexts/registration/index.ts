/**
 * contexts/registration/index.ts — Public interface for registration context
 *
 * Owns: respon_siswa_baru, bridge tokens
 * Other contexts and surfaces import ONLY from this file.
 */
export {
  handleGetDaftarSiswaBaru,
  handleSubmitDaftarSiswa,
  handleGetLinkSiswaBaru,
  handleGenerateFormBridge,
  handleGenerateLegacyMasterBridge,
  handleGenerateAiFormBridge,
} from './service';

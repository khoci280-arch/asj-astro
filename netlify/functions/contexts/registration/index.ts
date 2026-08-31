/**
 * contexts/registration/index.ts — Registration context
 * Owns: pendaftaran, bridge tokens
 * Wraps: actions-register.ts
 */
export { handleGetDaftarSiswaBaru, handleSubmitDaftarSiswa, handleGetLinkSiswaBaru, handleGenerateFormBridge, handleGenerateLegacyMasterBridge, handleGenerateAiFormBridge } from '../../_lib/actions-register';

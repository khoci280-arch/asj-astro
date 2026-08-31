/**
 * contexts/configuration/index.ts — Configuration context
 * Owns: sys_config (write), rincian_presets
 * Wraps: actions-config.ts
 */
export { handleUpdateSysConfig, handleGetRincianPresets, handleSaveRincianPreset, handleDeleteRincianPreset, handleRunMigration } from '../../_lib/actions-config';

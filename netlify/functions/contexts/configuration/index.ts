/**
 * contexts/configuration/index.ts — Public interface for configuration context
 *
 * Owns: sys_config (write), rincian_presets
 * Other contexts and surfaces import ONLY from this file.
 */
export {
  handleUpdateSysConfig,
  handleGetRincianPresets,
  handleSaveRincianPreset,
  handleDeleteRincianPreset,
  handleRunMigration,
} from './service';

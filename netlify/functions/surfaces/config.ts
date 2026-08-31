/**
 * surfaces/config.ts — Configuration surface (admin)
 */
import * as configuration from '../contexts/configuration';
export const CONFIG_ACTIONS: Record<string, Function> = {
  updateSysConfig: (p, s) => configuration.handleUpdateSysConfig(p, s),
  getRincianPresets: () => configuration.handleGetRincianPresets(),
  saveRincianPreset: (p, s) => configuration.handleSaveRincianPreset(p, s),
  deleteRincianPreset: (p, s) => configuration.handleDeleteRincianPreset(p, s),
  runMigration: (p, s) => configuration.handleRunMigration(p, s),
};

'use strict';
/**
 * config.js — Configuration surface entry point
 *
 * Handles: updateSysConfig, getRincianPresets, saveRincianPreset, deleteRincianPreset
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'updateSysConfig', 'getRincianPresets', 'saveRincianPreset', 'deleteRincianPreset',
]);

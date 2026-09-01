'use strict';
/**
 * register.js — Registration surface entry point
 *
 * Handles: getDaftarSiswaBaru, submitDaftarSiswa, getLinkSiswaBaru,
 *          generateFormBridge, generateLegacyMasterBridge, generateAiFormBridge
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'getDaftarSiswaBaru', 'submitDaftarSiswa', 'getLinkSiswaBaru',
  'generateFormBridge', 'generateLegacyMasterBridge', 'generateAiFormBridge',
]);

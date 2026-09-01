'use strict';
/**
 * master-data.js — Master data surface entry point
 *
 * Handles: getMasterDataByWa, submitMasterForm, getDrafCvMaster, simpanUpdateMaster
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'getMasterDataByWa', 'submitMasterForm', 'getDrafCvMaster', 'simpanUpdateMaster',
]);

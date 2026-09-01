'use strict';
/**
 * jobs.js — Jobs surface entry point
 *
 * Handles: simpanJobBaru, editLokerFull, ubahStatusJob,
 *          hapusJobData, updateTahapanDbJob, updateDokumenShare, tandaiGagalJob
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'simpanJobBaru', 'editLokerFull', 'ubahStatusJob',
  'hapusJobData', 'updateTahapanDbJob', 'updateDokumenShare', 'tandaiGagalJob',
]);

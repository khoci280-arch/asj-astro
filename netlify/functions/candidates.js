'use strict';
/**
 * candidates.js — Candidate management surface entry point
 *
 * Handles: getCandidatesPage, updateCatatanKandidat, updateKandidatSuper
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'getCandidatesPage', 'updateCatatanKandidat', 'updateKandidatSuper',
]);

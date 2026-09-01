'use strict';
/**
 * files.js — Documents/docs surface entry point
 *
 * Handles: shareData, submitFormPelamar, cekDataPelamar, getUploadUrls,
 *          isJobRequiresCv, submitApply, getExistingCandidateJsonByWa,
 *          simpanBiodataLengkap, simpanKandidatDanUpload,
 *          simpanBerkasTahapan, simpanRevisiKandidat, downloadJobDocs
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'shareData', 'submitFormPelamar', 'cekDataPelamar', 'getUploadUrls',
  'isJobRequiresCv', 'submitApply', 'getExistingCandidateJsonByWa',
  'simpanBiodataLengkap', 'simpanKandidatDanUpload',
  'simpanBerkasTahapan', 'simpanRevisiKandidat', 'downloadJobDocs',
]);

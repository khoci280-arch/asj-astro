'use strict';
/**
 * auth.js — Auth surface entry point
 *
 * Handles: checkAdminMaster, checkAdminPersonal, refreshAdminSession,
 *          loginKandidat, refreshKandidatSession, daftarKandidat,
 *          gantiPasswordKandidat, registerFcmToken, logout
 *
 * Surface-specific routing enables concurrent scaling:
 * auth requests don't block AI or document processing.
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'checkAdminMaster', 'checkAdminPersonal', 'refreshAdminSession',
  'loginKandidat', 'refreshKandidatSession', 'daftarKandidat',
  'gantiPasswordKandidat', 'registerFcmToken', 'logout',
]);

'use strict';
/**
 * notify.js — Notification surface entry point
 *
 * Handles: simpanWaTemplate, hapusWaTemplate, kirimSatuPesanFonnte, kirimTawaranMassal
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'simpanWaTemplate', 'hapusWaTemplate', 'kirimSatuPesanFonnte', 'kirimTawaranMassal',
]);

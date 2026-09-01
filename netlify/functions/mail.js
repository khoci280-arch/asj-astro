'use strict';
/**
 * mail.js — Application review surface entry point
 *
 * Handles: reviewForm, approveForm, rejectForm, deleteForm, tandaiDibacaForm
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'reviewForm', 'approveForm', 'rejectForm', 'deleteForm', 'tandaiDibacaForm',
]);

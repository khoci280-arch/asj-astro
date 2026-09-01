'use strict';
/**
 * public.js — Public data surface entry point
 *
 * Handles: getAppData, getMonthlyReport
 *
 * High-traffic read-only surface with CDN cache headers.
 * Separate function allows independent scaling for public traffic spikes.
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'getAppData', 'getMonthlyReport',
]);

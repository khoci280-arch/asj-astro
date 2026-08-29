'use strict';
/**
 * getAppData.js — Thin wrapper that delegates to bridge-links dispatcher.
 * Backward-compatible with CandidateDash.tsx which calls this directly.
 */
const { makeHandler } = require('./_lib/netlify-wrapper');
exports.handler = makeHandler();

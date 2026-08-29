'use strict';

/**
 * bridge-links.js — Single Netlify Function entry point for ALL backend actions.
 *
 * Replaces the 20 thin wrapper files from legacy. All requests go through
 * this one function, which delegates to the shared handler dispatcher in _lib/.
 *
 * Frontend calls: POST /.netlify/functions/bridge-links
 * Body: { action: string, args?: any[], sessionToken?: string }
 */
const { makeHandler } = require('./_lib/netlify-wrapper');

exports.handler = makeHandler();

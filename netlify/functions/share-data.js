'use strict';
/**
 * share-data.js — GET endpoint for the public TSK candidate viewer.
 *
 * The share view page (share.astro / legacy share.html) fetches
 * '/.netlify/functions/share-data?job=KODE' (GET, not a POST action).
 * Netlify maps /.netlify/functions/share-data to this file.
 *
 * A15 parity fix (2026-09-05): this file used to be a NOT_IMPLEMENTED stub
 * ("Fungsi ini belum diimplementasi di backend rebuild"), so the whole
 * share-card flow produced an error page — the modal's "Buka Share View"
 * never showed candidates. The real implementation (guard-less public read,
 * job lookup + candidate docs) lives in contexts/catalog service
 * handleShareData and is re-exported by _lib/handlers. This endpoint now
 * delegates to it (same contract as the previous generation build).
 *
 * B06 token gate (2026-09-05): the viewer now requires the per-job share
 * token (?tk=) minted by updateDokumenShare/getShareTokenForJob — bare
 * ?job= links are rejected server-side (docs/PARITY_CHECKLIST.md B06).
 */
const { handleShareData } = require('./_lib/handlers');

exports.handler = async (event) => {
  const p = (event.queryStringParameters) || {};
  const job = p.job || '';
  const tk = p.tk || '';
  let out;
  try {
    out = await handleShareData(job, tk);
  } catch (e) {
    out = { error: 'Error internal: ' + e.message };
  }
  return {
    statusCode: out.error ? 400 : 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(out),
  };
};

#!/usr/bin/env node
/**
 * netlify-rollback.mjs — Restore a previous Netlify deploy.
 *
 * WHY THIS EXISTS
 *   Netlify's CDN serves whatever deploy is marked production. Rolling back is
 *   therefore a matter of re-publishing an older, known-good deploy — which is
 *   far faster and safer than rebuilding from an old commit (the rebuild could
 *   itself be broken, and costs minutes when seconds matter).
 *
 *   Used in two places:
 *     1. Automatically, when a production deploy fails its post-deploy smoke test.
 *     2. Manually, via the rollback workflow, to pin back to a chosen deploy.
 *
 * USAGE
 *   # restore a specific deploy
 *   node scripts/ci/netlify-rollback.mjs --site <siteId> --token <tok> --to <deployId>
 *
 *   # find the newest ready production deploy, ignoring the one that just went out
 *   node scripts/ci/netlify-rollback.mjs --site <siteId> --token <tok> --exclude <deployId>
 *
 *   # see what would happen without changing anything
 *   node scripts/ci/netlify-rollback.mjs --site <id> --token <tok> --dry-run
 *
 * EXIT CODES
 *   0 restored and verified   1 rollback failed   2 bad usage / nothing to do
 */

const API = 'https://api.netlify.com/api/v1';

function parseArgs(argv) {
  const a = {
    site: process.env.NETLIFY_SITE_ID || '',
    token: process.env.NETLIFY_AUTH_TOKEN || '',
    to: '',
    exclude: '',
    dryRun: false,
    timeout: 180000,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--site': a.site = argv[++i]; break;
      case '--token': a.token = argv[++i]; break;
      case '--to': a.to = argv[++i]; break;
      case '--exclude': a.exclude = argv[++i]; break;
      case '--dry-run': a.dryRun = true; break;
      case '--timeout': a.timeout = Number(argv[++i]); break;
      case '--help':
      case '-h': a.help = true; break;
    }
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, token, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'asj-ci-rollback/1.0',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = (body && (body.message || body.error_description)) || res.statusText;
    throw new Error(`Netlify API ${options.method || 'GET'} ${path} -> ${res.status}: ${msg}`);
  }
  return body;
}

/** Newest-first list of deploys for the site. */
async function listDeploys(site, token) {
  const deploys = await api(`/sites/${site}/deploys?per_page=20`, token);
  return Array.isArray(deploys) ? deploys : [];
}

function pickTarget(deploys, { to, exclude }) {
  if (to) {
    const hit = deploys.find((d) => d.id === to);
    if (!hit) throw new Error(`Deploy "${to}" not found on this site.`);
    return hit;
  }
  // Newest ready deploy that is not the one we are rolling back away from.
  const candidate = deploys.find(
    (d) => d.state === 'ready' && d.id !== exclude
  );
  return candidate || null;
}

async function waitForReady(site, token, deployId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await api(`/sites/${site}/deploys/${deployId}`, token);
    if (last.state === 'ready') return { ok: true, deploy: last };
    if (last.state === 'error') return { ok: false, deploy: last, reason: 'deploy entered error state' };
    await sleep(5000);
  }
  return { ok: false, deploy: last, reason: `timed out after ${timeoutMs}ms (state=${last?.state})` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node scripts/ci/netlify-rollback.mjs --site <id> --token <t> [--to <deployId>|--exclude <deployId>] [--dry-run]');
    process.exit(0);
  }
  if (!args.site || !args.token) {
    console.error('Missing --site/NETLIFY_SITE_ID or --token/NETLIFY_AUTH_TOKEN');
    process.exit(2);
  }

  console.log(`Netlify rollback — site ${args.site}`);
  console.log('-'.repeat(56));

  const deploys = await listDeploys(args.site, args.token);
  if (!deploys.length) {
    console.error('No deploys found for this site — nothing to roll back to.');
    process.exit(2);
  }

  const target = pickTarget(deploys, args);
  if (!target) {
    console.error('No eligible previous deploy found (all deploys are the excluded one or not ready).');
    process.exit(2);
  }

  const when = target.created_at || target.published_at || 'unknown';
  console.log(`  target deploy : ${target.id}`);
  console.log(`  state         : ${target.state}`);
  console.log(`  created       : ${when}`);
  console.log(`  commit        : ${target.commit_ref ? String(target.commit_ref).slice(0, 8) : 'n/a'}`);
  console.log(`  branch        : ${target.branch || 'n/a'}`);

  if (args.dryRun) {
    console.log('\nDRY RUN — no changes made.');
    process.exit(0);
  }

  console.log('\nRestoring…');
  const restored = await api(`/sites/${args.site}/deploys/${target.id}/restore`, args.token, {
    method: 'POST',
  });
  console.log(`  restore issued -> deploy ${restored.id || target.id} (state=${restored.state})`);

  const verifyId = restored.id || target.id;
  const result = await waitForReady(args.site, args.token, verifyId, args.timeout);

  if (!result.ok) {
    console.error(`\nROLLBACK FAILED — ${result.reason}`);
    console.error(`Manual intervention required: pick a deploy in the Netlify UI and click "Publish deploy".`);
    process.exit(1);
  }

  const url = result.deploy.ssl_url || result.deploy.url;
  console.log(`\nROLLBACK COMPLETE — ${url} is now serving deploy ${verifyId}`);
  console.log(`deploy-url=${url}`);
  if (process.env.GITHUB_OUTPUT) {
    // Surface the URL to the calling workflow for the notification step.
    const fs = await import('node:fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `deploy-url=${url}\n`);
  }
}

main().catch((err) => {
  console.error(`\nROLLBACK FAILED — ${err.message}`);
  process.exit(1);
});

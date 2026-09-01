#!/usr/bin/env node
/**
 * smoke-test.mjs — Post-deploy health check used as the rollback gate.
 *
 * WHY THIS EXISTS
 *   A deploy returning HTTP 200 from a CDN edge proves nothing about whether the
 *   built app actually works. This script exercises the deployed URL the way a
 *   real visitor would: fetch the document, assert key markers survived the
 *   build/minify pipeline, and optionally probe an API endpoint.
 *
 *   The exit code is what drives automatic rollback. Keep the checks here
 *   cheap, deterministic, and free of credentials — a flaky smoke test causes
 *   more incidents than it prevents.
 *
 * USAGE
 *   node scripts/ci/smoke-test.mjs --url https://example.netlify.app
 *   node scripts/ci/smoke-test.mjs --url https://x.app --expect "ASJ" --expect "Portal"
 *   node scripts/ci/smoke-test.mjs --url https://x.app --health /.netlify/functions/health
 *
 *   --retries   attempts before giving up (default 3)
 *   --timeout   per-request timeout in ms (default 15000)
 *   --backoff   base delay in ms, doubled each retry (default 2000)
 */

function parseArgs(argv) {
  const args = {
    url: process.env.SMOKE_URL || process.env.BASE_URL || '',
    expect: [],
    health: '',
    retries: 3,
    timeout: 15000,
    backoff: 2000,
    insecure: false,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--url': args.url = argv[++i]; break;
      case '--expect': args.expect.push(argv[++i]); break;
      case '--health': args.health = argv[++i]; break;
      case '--retries': args.retries = Number(argv[++i]); break;
      case '--timeout': args.timeout = Number(argv[++i]); break;
      case '--backoff': args.backoff = Number(argv[++i]); break;
      case '--insecure': args.insecure = true; break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url, timeoutMs, insecure) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'asj-ci-smoke/1.0' },
      ...(insecure ? { tls: { rejectUnauthorized: false } } : {}),
    });
    const body = await res.text();
    return { ok: true, status: res.status, body, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : err.message, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(label, url, args, expect, wantStatus = 200) {
  let lastErr = '';
  for (let attempt = 1; attempt <= args.retries; attempt++) {
    const r = await fetchOnce(url, args.timeout, args.insecure);
    if (r.ok && r.status === wantStatus) {
      const missing = expect.filter((m) => !r.body.includes(m));
      if (missing.length === 0) {
        console.log(`  PASS  ${label} — ${r.status} in ${r.ms}ms (${r.body.length} bytes)`);
        if (expect.length) console.log(`        markers found: ${expect.join(', ')}`);
        return { pass: true };
      }
      lastErr = `HTTP ${r.status} but missing marker(s): ${missing.join(', ')}`;
    } else if (r.ok) {
      lastErr = `expected HTTP ${wantStatus}, got ${r.status}`;
    } else {
      lastErr = r.error;
    }
    if (attempt < args.retries) {
      const wait = args.backoff * Math.pow(2, attempt - 1);
      console.log(`  WARN  ${label} — attempt ${attempt}/${args.retries} failed (${lastErr}); retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  console.error(`  FAIL  ${label} — ${lastErr}`);
  return { pass: false, reason: lastErr };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.url) {
    console.error('Usage: node scripts/ci/smoke-test.mjs --url <url> [--expect <text>] [--health <path>]');
    process.exit(args.help ? 0 : 2);
  }

  const base = args.url.replace(/\/+$/, '');
  console.log(`Smoke test — ${base}`);
  console.log('-'.repeat(56));

  const results = [];
  results.push(await checkUrl('document', base, args, args.expect, 200));

  if (args.health) {
    const healthUrl = base + (args.health.startsWith('/') ? args.health : `/${args.health}`);
    // Health endpoints may legitimately answer 200 or 204; accept either.
    const r = await fetchOnce(healthUrl, args.timeout, args.insecure);
    const good = r.ok && (r.status === 200 || r.status === 204);
    if (good) console.log(`  PASS  health endpoint — ${r.status} in ${r.ms}ms`);
    else console.error(`  FAIL  health endpoint — ${r.ok ? `HTTP ${r.status}` : r.error}`);
    results.push({ pass: good, reason: r.ok ? `HTTP ${r.status}` : r.error });
  }

  console.log('-'.repeat(56));
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error(`SMOKE TEST FAILED (${failed.length}/${results.length} checks)`);
    process.exit(1);
  }
  console.log(`SMOKE TEST PASSED (${results.length}/${results.length} checks)`);
}

main().catch((err) => {
  console.error('smoke-test crashed:', err);
  process.exit(1);
});

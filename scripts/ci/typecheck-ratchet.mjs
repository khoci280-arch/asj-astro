#!/usr/bin/env node
/**
 * typecheck-ratchet.mjs — Debt-aware typecheck gate ("ratchet").
 *
 * WHY NOT JUST RUN `tsc --noEmit` AND FAIL ON ANY ERROR?
 *   This repo carries a large amount of pre-existing type debt (hundreds of
 *   errors from the JS->TS migration). Blocking CI on all of it today means the
 *   pipeline is red from commit one — and a permanently red pipeline is a
 *   pipeline the team learns to ignore, then deletes. That is strictly worse
 *   than no pipeline.
 *
 *   A ratchet instead enforces the rule that actually matters:
 *     **no new type errors may be introduced.**
 *   Debt can only go down. As errors get fixed, `--update-baseline` lowers the
 *   bar and the ratchet prevents it from creeping back up.
 *
 * FAILURE CONDITIONS (all other changes are reported but non-blocking)
 *   1. Total error count increased vs. baseline.
 *   2. A file with NO errors in the baseline now has errors (new debt surface).
 *
 *   Line numbers are deliberately excluded from the fingerprint — they shift
 *   constantly and would make the gate flaky on unrelated edits.
 *
 * USAGE
 *   node scripts/ci/typecheck-ratchet.mjs              # enforce
 *   node scripts/ci/typecheck-ratchet.mjs --update-baseline
 *   node scripts/ci/typecheck-ratchet.mjs --baseline .ci/tsc-baseline.json
 *
 * EXIT CODES
 *   0 pass (or baseline written)   1 ratchet regression   2 tooling error
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BASELINE = '.ci/tsc-baseline.json';

function parseArgs(argv) {
  const args = { update: false, baseline: DEFAULT_BASELINE, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--update-baseline') args.update = true;
    else if (argv[i] === '--baseline') args.baseline = argv[++i];
    else if (argv[i] === '--json') args.json = true;
  }
  return args;
}

function resolveTsc() {
  // Invoke `node node_modules/typescript/bin/tsc` rather than `npx tsc`.
  // npx resolves through .cmd shims that are unreliable on Windows (spawnSync
  // ENOENT) and adds a second resolution layer we do not control. This keeps
  // the gate identical on Linux CI and a Windows dev machine.
  const local = path.resolve('node_modules', 'typescript', 'bin', 'tsc');
  if (fs.existsSync(local)) return { cmd: process.execPath, args: [local] };
  return { cmd: 'npx', args: ['tsc'] };
}

/** @returns {{file:string,line:number,col:number,code:string,message:string}[]} */
function runTsc() {
  const { cmd, args } = resolveTsc();
  let out = '';
  try {
    // --pretty false gives the stable `file(line,col): error TSxxxx: msg` form.
    out = execFileSync(cmd, [...args, '--noEmit', '--pretty', 'false'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    // tsc exits non-zero when there are errors; stdout still holds the report.
    out = (err.stdout || '') + (err.stderr || '');
    if (!out.trim() && err.status !== 1 && err.status !== 2) {
      throw new Error(`tsc failed to run (${cmd} ${args.join(' ')}): ${err.message}`);
    }
  }
  return parseTsc(out);
}

function parseTsc(output) {
  const re = /^(?!\s)(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;
  const errors = [];
  for (const raw of output.split(/\r?\n/)) {
    const m = re.exec(raw.trimEnd());
    if (!m) continue;
    errors.push({
      file: m[1].replace(/\\/g, '/'),
      line: Number(m[2]),
      col: Number(m[3]),
      code: m[4],
      message: m[5],
    });
  }
  return errors;
}

function summarise(errors) {
  const byFile = {};
  const byCode = {};
  for (const e of errors) {
    byFile[e.file] = (byFile[e.file] || 0) + 1;
    byCode[e.code] = (byCode[e.code] || 0) + 1;
  }
  return {
    total: errors.length,
    generatedAt: new Date().toISOString(),
    byFile: Object.fromEntries(Object.entries(byFile).sort((a, b) => b[1] - a[1])),
    byCode: Object.fromEntries(Object.entries(byCode).sort((a, b) => b[1] - a[1])),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = runTsc();
  const current = summarise(errors);
  const baselinePath = path.resolve(args.baseline);

  if (args.update) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
    console.log(`Baseline written to ${args.baseline}`);
    console.log(`  total errors recorded: ${current.total}`);
    console.log(`  files affected: ${Object.keys(current.byFile).length}`);
    if (args.json) console.log(JSON.stringify(current));
    process.exit(0);
  }

  if (!fs.existsSync(baselinePath)) {
    console.error(`Baseline not found at ${baselinePath}.`);
    console.error(`Create it with: node scripts/ci/typecheck-ratchet.mjs --update-baseline`);
    process.exit(2);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  console.log('Typecheck ratchet');
  console.log('-'.repeat(56));
  console.log(`  baseline : ${baseline.total} errors (${baseline.generatedAt})`);
  console.log(`  current  : ${current.total} errors`);
  console.log('');

  const failures = [];

  if (current.total > baseline.total) {
    failures.push(
      `Error count increased: ${baseline.total} -> ${current.total} (+${current.total - baseline.total})`
    );
  }

  const newFiles = Object.keys(current.byFile).filter((f) => !(f in baseline.byFile));
  if (newFiles.length) {
    const detail = newFiles.map((f) => `${f} (${current.byFile[f]})`).join(', ');
    failures.push(`Type errors appeared in previously clean file(s): ${detail}`);
  }

  // Informational: files that got better or worse, without failing the build.
  const improved = [];
  const regressed = [];
  for (const [file, count] of Object.entries(current.byFile)) {
    const before = baseline.byFile[file] || 0;
    if (count > before) regressed.push(`${file}: ${before} -> ${count}`);
    else if (count < before) improved.push(`${file}: ${before} -> ${count}`);
  }

  if (improved.length) {
    console.log(`Improvements (${improved.length} file(s)):`);
    for (const line of improved.slice(0, 10)) console.log(`  - ${line}`);
    if (improved.length > 10) console.log(`  ...and ${improved.length - 10} more`);
    console.log('');
  }
  if (regressed.length) {
    console.log(`Files with more errors than baseline (${regressed.length}):`);
    for (const line of regressed.slice(0, 10)) console.log(`  ! ${line}`);
    if (regressed.length > 10) console.log(`  ...and ${regressed.length - 10} more`);
    console.log('');
  }

  const newCodes = Object.keys(current.byCode).filter((c) => !(c in baseline.byCode));
  if (newCodes.length) {
    console.log(`Note — new error categories detected: ${newCodes.join(', ')}`);
    console.log('');
  }

  console.log('Top error categories:');
  for (const [code, count] of Object.entries(current.byCode).slice(0, 8)) {
    console.log(`  ${code.padEnd(8)} ${count}`);
  }
  console.log('-'.repeat(56));

  if (failures.length) {
    console.error('TYPECHECK RATCHET FAILED');
    for (const f of failures) console.error(`  - ${f}`);
    console.error('');
    console.error('Fix the new errors, or — if you deliberately reduced debt —');
    console.error('re-record the baseline:');
    console.error('  node scripts/ci/typecheck-ratchet.mjs --update-baseline');
    process.exit(1);
  }

  const delta = baseline.total - current.total;
  console.log(
    delta > 0
      ? `TYPECHECK RATCHET PASSED — debt reduced by ${delta}. Re-baseline to lock it in.`
      : 'TYPECHECK RATCHET PASSED — no new type errors.'
  );
  if (args.json) console.log(JSON.stringify(current));
}

main();

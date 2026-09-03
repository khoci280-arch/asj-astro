#!/usr/bin/env node
/**
 * impact-gate.mjs — the CI drift gate over idx impact (design §8.5, `idx:gate`).
 *
 * Reads per-symbol thresholds from a config file (default
 * indexer/impact-gate.json), builds the index ONCE, and for every entry
 * resolves the name through the same candidate policy as `idx refs` /
 * `idx impact` (symbolsDefining -> refsOf -> impactReport — the single
 * files-set owner shared with the CLI), failing when a protected symbol's
 * affected-file set exceeds its gate.
 *
 * Exit: 0 all within gate; 1 any exceeded, unresolved, or ambiguous entry
 * (ambiguous names are config bugs: the gate never guesses).
 *
 *   node indexer/scripts/impact-gate.mjs [--root <dir>] [--config <path>]
 *
 * Windows-safe: no spawns, no unix-only paths; dist must be built (the npm
 * entry `npm run idx:gate` builds first).
 */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildIndex } from '../dist/indexer/src/build.js';
import { dumpDoc } from '../dist/indexer/src/dump.js';
import { impactReport, indexFromDoc, refsOf, symbolsDefining } from '../dist/indexer/src/query.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

function flag(name) {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  if (v === undefined) throw new Error(name + ' needs a value');
  return v;
}

const root = resolve(flag('--root') ?? repoRoot);
const configPath = resolve(flag('--config') ?? join(repoRoot, 'indexer/impact-gate.json'));
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const entries = config.entries;
if (!Array.isArray(entries)) throw new Error('config must have an entries array');

const index = indexFromDoc(dumpDoc(buildIndex(root)));

let failed = 0;
for (const e of entries) {
  if (!e || typeof e.name !== 'string' || !Number.isInteger(e.gate) || e.gate <= 0) {
    console.error('idx:gate: bad entry: ' + JSON.stringify(e));
    failed++;
    continue;
  }
  const defs = symbolsDefining(index, e.name);
  if (defs.length !== 1) {
    console.error(
      `idx:gate: ${e.name} must resolve to exactly one definition (got ${defs.length}); ` +
        'gate entries must be unambiguous names — qualify or remove the entry',
    );
    for (const d of defs) console.error('  ' + d.id);
    failed++;
    continue;
  }
  const rep = impactReport(refsOf(index, defs[0].id));
  const ok = rep.files.length <= e.gate;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${e.name}: ${rep.files.length} file(s) (gate ${e.gate})${e.note ? ' \u2014 ' + e.note : ''}`);
  if (!ok) failed++;
}
if (failed > 0) {
  console.error(`idx:gate: ${failed} gate(s) exceeded or misconfigured`);
  process.exitCode = 1;
} else {
  console.log(`idx:gate: ${entries.length} protected symbol(s) within gate`);
}

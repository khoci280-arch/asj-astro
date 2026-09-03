/**
 * watch.e2e.ts — Phase 6 end-to-end smoke, deliberately OUT of the default
 * vitest run (indexer include is `**\/*.test.ts`; this file needs real fs
 * events and timers). Run against compiled dist after `npm run idx:build`:
 *
 *   node indexer/dist/indexer/src/watch.e2e.js
 *
 * Creates a temp fixture tree, spawns `idx watch` on it, then drives three
 * mutations — create / modify / delete — and asserts the watch commits one
 * generation per mutation with the right added/changed/removed sets, that
 * current.json tracks the epoch, and that --keep-previous rotates
 * previous.json. Fails (exit 1) on any timeout or assertion.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import readline from 'node:readline';
import type { GenerationDiff } from './watch.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../'); // dist → 4 hops
const CLI = join(REPO_ROOT, 'indexer/dist/indexer/src/cli.js');
const FIXTURE = mkdtempSync(join(tmpdir(), 'idx-e2e-root-'));
const STATE = mkdtempSync(join(tmpdir(), 'idx-e2e-state-'));

function writeFile(rel: string, body: string): string {
  const abs = join(FIXTURE, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body, 'utf8');
  return abs;
}

function waitFor(proc: ChildProcess, gen: number, what: string, timeoutMs = 20000): Promise<GenerationDiff> {
  return new Promise((resolveP, reject) => {
    const rl = readline.createInterface({ input: proc.stdout! });
    const timer = setTimeout(() => {
      rl.close();
      reject(new Error(`timeout waiting for gen ${gen} (${what})`));
    }, timeoutMs);
    rl.on('line', (line) => {
      let d: GenerationDiff;
      try {
        d = JSON.parse(line) as GenerationDiff;
      } catch {
        return; // not a JSONL diff line
      }
      if (typeof d.gen === 'number' && d.gen >= gen) {
        clearTimeout(timer);
        rl.close();
        resolveP(d);
      }
    });
  });
}

function expectSilence(proc: ChildProcess, what: string, ms = 2500): Promise<void> {
  return new Promise((resolveP, reject) => {
    const rl = readline.createInterface({ input: proc.stdout! });
    const timer = setTimeout(() => {
      rl.close();
      resolveP();
    }, ms);
    rl.on('line', () => {
      clearTimeout(timer);
      rl.close();
      reject(new Error(`expected no generation while ${what}, but got a diff line`));
    });
  });
}

function startWatch(opts: { keepPrevious?: boolean; watchdogMs?: number } = {}): ChildProcess {
  const argv = [CLI, 'watch', '--root', FIXTURE, '--state', STATE];
  if (opts.keepPrevious) argv.push('--keep-previous');
  if (opts.watchdogMs) argv.push('--watchdog-ms', String(opts.watchdogMs));
  const proc = spawn(process.execPath, argv, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr!.on('data', (c: Buffer) => process.stderr.write(c));
  proc.on('error', (err) => {
    throw new Error(`watch spawn failed: ${err.message}`);
  });
  return proc;
}

async function stopWatch(proc: ChildProcess): Promise<void> {
  if (proc.exitCode !== null) return;
  proc.kill();
  await new Promise<void>((done) => {
    proc.once('exit', () => done());
    setTimeout(done, 3000); // give up waiting; process reaped by the OS
  });
}

function attachCollector(proc: ChildProcess): { lines: GenerationDiff[] } {
  const lines: GenerationDiff[] = [];
  readline.createInterface({ input: proc.stdout! }).on('line', (line) => {
    try {
      const d = JSON.parse(line) as GenerationDiff;
      if (typeof d.gen === 'number') lines.push(d);
    } catch {
      // not a JSONL diff line
    }
  });
  return { lines };
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

async function waitGen(lines: GenerationDiff[], minGen: number, what: string, timeoutMs = 20000): Promise<GenerationDiff> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const hit = lines.find((d) => d.gen >= minGen);
    if (hit) return hit;
    await sleep(50);
  }
  throw new Error('timeout waiting for gen ' + minGen + ' (' + what + ')');
}

async function waitSilence(lines: GenerationDiff[], what: string, ms = 2000): Promise<void> {
  const base = lines.length;
  await sleep(ms);
  const extra = lines.length - base;
  if (extra > 0) throw new Error('expected no generation while ' + what + ', but got ' + extra + ' more');
}

async function settle(lines: GenerationDiff[], what: string, quietMs = 2000, deadlineMs = 10000): Promise<void> {
  const t0 = Date.now();
  let lastCount = lines.length;
  let quietSince = Date.now();
  while (Date.now() - t0 < deadlineMs) {
    await sleep(150);
    if (lines.length !== lastCount) {
      lastCount = lines.length;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return;
    }
  }
  throw new Error('generations never settled while ' + what);
}

async function main(): Promise<void> {
  // Fixture: .gitignore is required (buildIndex reads it) + two code files.
  writeFileSync(join(FIXTURE, '.gitignore'), 'node_modules/\n', 'utf8');
  writeFile('src/a.ts', 'export const alpha = 1;\n');
  writeFile('src/b.ts', 'export const beta = 2;\n');

  const proc = startWatch();
  try {
    // gen 1 — init: both files added
    const g1 = await waitFor(proc, 1, 'initial generation');
    assert.deepEqual(g1.added, ['src/a.ts', 'src/b.ts'], `gen1 added=${JSON.stringify(g1.added)}`);
    assert.deepEqual(g1.changed, [], 'gen1 changed must be empty');
    assert.equal(g1.gen, 1);

    // create c.ts → gen 2 (watch)
    writeFile('src/c.ts', 'export const gamma = 3;\n');
    const g2 = await waitFor(proc, 2, 'create diff');
    assert.deepEqual(g2.added, ['src/c.ts'], `gen2 added=${JSON.stringify(g2.added)}`);
    assert.equal(g2.symbolDelta, 1, `gen2 symbolDelta=${g2.symbolDelta}`);

    // modify a.ts → gen 3 (watch)
    writeFile('src/a.ts', 'export const alpha = 10;\n');
    const g3 = await waitFor(proc, 3, 'modify diff');
    assert.deepEqual(g3.changed, ['src/a.ts'], `gen3 changed=${JSON.stringify(g3.changed)}`);
    assert.deepEqual(g3.added, [], `gen3 added=${JSON.stringify(g3.added)}`);

    // delete c.ts → gen 4 (watch)
    rmSync(join(FIXTURE, 'src/c.ts'));
    const g4 = await waitFor(proc, 4, 'delete diff');
    assert.deepEqual(g4.removed, ['src/c.ts'], `gen4 removed=${JSON.stringify(g4.removed)}`);
    assert.equal(g4.symbolDelta, -1, `gen4 symbolDelta=${g4.symbolDelta}`);

    const current = JSON.parse(readFileSync(join(STATE, 'current.json'), 'utf8')) as { epoch: number };
    assert.equal(current.epoch, 4, 'current.json epoch tracks the last committed generation');
    assert.equal(existsSync(join(STATE, 'previous.json')), false, 'previous.json absent without --keep-previous');
  } finally {
    await stopWatch(proc);
  }

  // Second phase: --keep-previous rotates previous.json on the next commit.
  const proc2 = startWatch({ keepPrevious: true }); // --keep-previous; no change since gen 4 → no new init generation
  try {
    await expectSilence(proc2, 'the tree is unchanged after restart');
    writeFile('src/b.ts', 'export const beta = 20;\n');
    const g5 = await waitFor(proc2, 5, 'keep-previous gen');
    assert.deepEqual(g5.changed, ['src/b.ts'], `gen5 changed=${JSON.stringify(g5.changed)}`);
    assert.equal(existsSync(join(STATE, 'previous.json')), true, 'previous.json written under --keep-previous');
    const prev = JSON.parse(readFileSync(join(STATE, 'previous.json'), 'utf8')) as { epoch: number };
    assert.equal(prev.epoch, 4, 'previous.json holds the pre-rotation generation');
  } finally {
    await stopWatch(proc2);
  }

  // Phase 3 — rapid-edit burst: several quick edits in one tick must settle
  // (one or a few coalesced generations — not pinned) with strictly monotonic
  // epochs, and current.json must index the LAST content written, with no stale
  // intermediate marker surviving.
  const proc3 = startWatch();
  const c3 = attachCollector(proc3);
  try {
    for (let v = 100; v <= 104; v++) writeFile('src/a.ts', 'export const alpha = ' + v + ';\n');
    writeFile('src/a.ts', 'export const rapidMid = 1;\n');
    writeFile('src/a.ts', 'export const rapidFinal = 2;\n');
    await waitGen(c3.lines, 6, 'rapid-edit burst commits a generation', 20000);
    await settle(c3.lines, 'the rapid-edit burst settles', 2500);
    const burst = c3.lines.filter((d) => d.gen >= 6);
    assert.ok(burst.length > 0, 'the burst committed at least one generation');
    const g = burst[burst.length - 1];
    assert.ok(g.gen >= 6, 'burst generation monotonic: gen ' + g.gen);
    assert.deepEqual(g.changed, ['src/a.ts'], 'final burst change is exactly src/a.ts: ' + JSON.stringify(g.changed));
    assert.deepEqual(g.added, [], 'no files added by the burst');
    assert.deepEqual(g.removed, [], 'no files removed by the burst');
    for (let i = 1; i < burst.length; i++) {
      assert.ok(burst[i].gen > burst[i - 1].gen, 'burst epochs strictly increase: ' + JSON.stringify(burst.map((d) => d.gen)));
    }
    const settled = JSON.parse(readFileSync(join(STATE, 'current.json'), 'utf8')) as { epoch: number; symbols: Array<{ name: string }> };
    assert.equal(settled.epoch, g.gen, 'current.json epoch equals the last committed burst generation');
    const names = settled.symbols.map((x) => x.name);
    assert.ok(names.includes('rapidFinal'), 'final generation indexes the last burst content (rapidFinal present): ' + JSON.stringify(names));
    assert.ok(!names.includes('rapidMid'), 'no committed generation kept an intermediate burst marker: ' + JSON.stringify(names));
    assert.ok(!names.includes('alpha'), 'burst converged on the final content (alpha gone): ' + JSON.stringify(names));
  } finally {
    await stopWatch(proc3);
  }

  // Phase 4 — watchdog reconcile window: a small --watchdog-ms runs periodic
  // reconcile sweeps alongside fs.watch. A change commits within the window
  // (the trigger may be 'watch' or 'watchdog' — fs.watch may legitimately fire
  // first, so the word is not pinned), and idle sweeps emit nothing.
  const proc4 = startWatch({ watchdogMs: 600 });
  const c4 = attachCollector(proc4);
  try {
    await waitSilence(c4.lines, 'unchanged restart stays silent across watchdog sweeps', 2000);
    writeFile('src/b.ts', 'export const beta = 30;\n');
    const g = await waitGen(c4.lines, 7, 'watchdog-window change commits', 15000);
    assert.ok(g.gen >= 7, 'watchdog-window generation monotonic: gen ' + g.gen);
    assert.ok(g.trigger === 'watch' || g.trigger === 'watchdog', 'trigger is watch or watchdog, got ' + g.trigger);
    assert.deepEqual(g.changed, ['src/b.ts'], 'watchdog-window change is exactly src/b.ts: ' + JSON.stringify(g.changed));
    await waitSilence(c4.lines, 'idle watchdog sweeps after the change', 2000);
  } finally {
    await stopWatch(proc4);
  }

  rmSync(FIXTURE, { recursive: true, force: true });
  rmSync(STATE, { recursive: true, force: true });
  console.log('watch e2e: ok — init/create/modify/delete, keep-previous rotation, rapid-edit coalescing, watchdog reconcile');
}

main().catch((err) => {
  console.error(`watch e2e FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});

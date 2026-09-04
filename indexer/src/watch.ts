/**
 * watch.ts — Phase 6 MVP: generation diffs, `idx watch`, and serve-side
 * refresh over a generation state dir (design §6, §11 row 6).
 *
 * §6.2 shipped here: each generation carries a per-file parse cache (§6.1's
 * content-hash split) across rebuilds — files whose (content hash, fileIdx)
 * are unchanged since the previous generation skip Stage 2 entirely
 * (buildIndex's parseCache), so a one-file save re-parses one file, not all
 * 247. Remaining row-6 items, recorded in §11/§13: the dirty-set impact
 * analysis half (bind/resolve over an impact set instead of the global
 * ~0.1 s passes — below the fan-out threshold on this tree, so deliberately
 * not built) and WS push. This phase still owns and verifies the generation
 * lifecycle: monotonic epochs, atomic snapshot commits, diff computation,
 * watcher → rebuild loop, JSONL diff output.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DumpDoc } from './dump.js';
import { dumpDoc, loadSnapshot } from './dump.js';
import { discoverFiles, isDeniedDir, parseGitignore } from './discover.js';
import { buildIndex, type ParseReuseCache } from './build.js';

// ─────────────────────────────────────────────────────────────────────────────
// Pure: diff computation over two dump documents
// ─────────────────────────────────────────────────────────────────────────────

export type DiffTrigger = 'init' | 'watch' | 'poll' | 'watchdog' | 'manual';

/** One committed generation — the watch JSONL line and the /diff?since unit. */
export interface GenerationDiff {
  gen: number;
  trigger: DiffTrigger;
  ms: number;
  fileCount: number;
  symbolCount: number;
  referenceCount: number;
  edgeCount: number;
  importEdgeCount: number;
  unresolvedCount: number;
  added: string[];
  changed: string[];
  removed: string[];
  fileDelta: number;
  symbolDelta: number;
  referenceDelta: number;
  edgeDelta: number;
  importEdgeDelta: number;
  unresolvedDelta: number;
  /** Files the generation failed to parse (poisoned, BuildResult carries the errors). */
  poisoned: Array<{ path: string; error: string }>;
}

export interface DocCounts {
  fileCount: number;
  symbolCount: number;
  referenceCount: number;
  edgeCount: number;
  importEdgeCount: number;
  unresolvedCount: number;
}

export function docCounts(doc: DumpDoc): DocCounts {
  return {
    fileCount: doc.files.length,
    symbolCount: doc.symbols.length,
    referenceCount: doc.refs.length,
    edgeCount: doc.symbolEdges.length,
    importEdgeCount: (doc.importEdges ?? []).length,
    unresolvedCount: doc.unresolved.length + (doc.unresolvedImports ?? []).length,
  };
}

/** File-level drift between two documents: added/changed (by hash)/removed, sorted. */
export function fileDrift(prev: DumpDoc | null, next: DumpDoc): { added: string[]; changed: string[]; removed: string[] } {
  const prevHashes = new Map<string, string>();
  if (prev) for (const f of prev.files) prevHashes.set(f.path, f.hash);
  const added: string[] = [];
  const changed: string[] = [];
  for (const f of next.files) {
    const old = prevHashes.get(f.path);
    if (old === undefined) added.push(f.path);
    else if (old !== f.hash) changed.push(f.path);
  }
  const nextPaths = new Set(next.files.map((f) => f.path));
  const removed = prev ? prev.files.filter((f) => !nextPaths.has(f.path)).map((f) => f.path) : [];
  // Deterministic output for the JSONL diff surface regardless of build order.
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

/** Full diff of next vs prev; the fields GenerationDiff carries besides gen/trigger/ms. */
export function diffDocs(prev: DumpDoc | null, next: DumpDoc): Omit<GenerationDiff, 'gen' | 'trigger' | 'ms'> {
  const drift = fileDrift(prev, next);
  const p = prev ? docCounts(prev) : null;
  const n = docCounts(next);
  const c = (which: keyof DocCounts): number => n[which] - (p?.[which] ?? 0);
  return {
    fileCount: n.fileCount,
    symbolCount: n.symbolCount,
    referenceCount: n.referenceCount,
    edgeCount: n.edgeCount,
    importEdgeCount: n.importEdgeCount,
    unresolvedCount: n.unresolvedCount,
    added: drift.added,
    changed: drift.changed,
    removed: drift.removed,
    fileDelta: c('fileCount'),
    symbolDelta: c('symbolCount'),
    referenceDelta: c('referenceCount'),
    edgeDelta: c('edgeCount'),
    importEdgeDelta: c('importEdgeCount'),
    unresolvedDelta: c('unresolvedCount'),
    poisoned: next.files
      .filter((f) => f.poisoned !== undefined)
      .map((f) => ({ path: f.path, error: f.poisoned!.error })),
  };
}

/** A generation with no file drift and no count change carries no information. */
export function isNoopDiff(d: Omit<GenerationDiff, 'gen' | 'trigger' | 'ms'>): boolean {
  return d.added.length === 0 && d.changed.length === 0 && d.removed.length === 0 && d.fileDelta === 0 && d.symbolDelta === 0 && d.referenceDelta === 0 && d.edgeDelta === 0 && d.unresolvedDelta === 0;
}

/** Bounded in-memory diff history (serve /diff?since and watch bookkeeping). */
export function pushHistory(history: GenerationDiff[], d: GenerationDiff, max = 100): void {
  history.push(d);
  while (history.length > max) history.shift();
}

/**
 * Assemble one committed-generation line in the stable key order. THE single
 * place the event shape is built (watch JSONL, /diff history, /gen health)
 * so the wire shape cannot drift between producers.
 */
export function generationLine(gen: number, trigger: DiffTrigger, ms: number, base: Omit<GenerationDiff, 'gen' | 'trigger' | 'ms'>): GenerationDiff {
  return { gen, trigger, ms, ...base };
}

/**
 * Writer-side generation policy (idx watch rebuilds, live serve POST
 * /rebuild): a real diff commits at epoch = prev.epoch + 1, stamps
 * next.epoch (callers own `next`), and returns the line; a no-op returns
 * null and nothing is committed. Observers that load persisted docs
 * (serve --state) must NOT use this: their gen comes from the doc on disk,
 * which can skip an intermediate commit between polls.
 */
export function commitGenerationLine(prev: DumpDoc | null, next: DumpDoc, trigger: DiffTrigger, ms: number): GenerationDiff | null {
  const base = diffDocs(prev, next);
  if (isNoopDiff(base)) return null;
  const gen = (prev?.epoch ?? 0) + 1;
  next.epoch = gen;
  return generationLine(gen, trigger, ms, base);
}

// ─────────────────────────────────────────────────────────────────────────────
// State dir: atomic current.json + optional previous.json
// ─────────────────────────────────────────────────────────────────────────────

export function defaultStateDir(rootDir: string): string {
  const digest = createHash('sha1').update(rootDir).digest('hex').slice(0, 12);
  return join(process.env.TEMP ?? process.env.TMP ?? '/tmp', `idx-state-${digest}`);
}

function writeAtomic(path: string, text: string): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, path);
}

/** Load the newest committed doc in a state dir, or null when none exists. */
export function loadStateDoc(stateDir: string): DumpDoc | null {
  const p = join(stateDir, 'current.json');
  if (!existsSync(p)) return null;
  try {
    return loadSnapshot(p);
  } catch {
    return null; // torn or corrupt previous run — treat as empty and rebuild from scratch
  }
}

export function persistGeneration(stateDir: string, doc: DumpDoc, keepPrevious: boolean): void {
  mkdirSync(stateDir, { recursive: true });
  const current = join(stateDir, 'current.json');
  if (keepPrevious && existsSync(current)) {
    const prev = join(stateDir, 'previous.json');
    rmSync(prev, { force: true });
    renameSync(current, prev);
  }
  writeAtomic(current, JSON.stringify(doc));
}

// ─────────────────────────────────────────────────────────────────────────────
// Watch driver
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchOptions {
  rootDir: string;
  stateDir: string;
  /** >0 forces the polling driver (fs.watch disabled); default poll fallback 2000 ms. */
  pollMs?: number;
  /**
   * When fs.watch is active, also run the poll driver at this interval as a
   * periodic reconcile (default 5000 ms): a change no fs event reported is
   * committed on the next sweep. No-op reconciles stay silent.
   */
  watchdogMs?: number;
  keepPrevious?: boolean;
  /** Human-readable log line (stderr-side), e.g. watcher fallback reasons. */
  log?: (line: string) => void;
}

export interface WatchHandle {
  stop(): void;
}

const DEBOUNCE_MS = 120;

/**
 * Rebuild the whole index into one generation and commit it. `buildIndex`
 * reads rootDir/.gitignore, so a root without one fails here (exit 1). The
 * parse cache (§6.2) rides along: files unchanged since the previous
 * generation skip Stage 2, so the rebuild cost tracks the dirty set's size,
 * not the inventory's.
 */
async function buildGeneration(
  opts: WatchOptions,
  onDiff: (d: GenerationDiff) => void,
  trigger: DiffTrigger,
  prevDoc: DumpDoc | null,
  parseCache: ParseReuseCache,
): Promise<DumpDoc> {
  const t0 = Date.now();
  const r = buildIndex(opts.rootDir, { deep: false, parseCache }); // deep tier off: generation latency (§13)
  const doc = dumpDoc(r);
  const line = commitGenerationLine(prevDoc, doc, trigger, Date.now() - t0);
  if (!line) return prevDoc ?? doc; // unchanged — no new generation
  persistGeneration(opts.stateDir, doc, opts.keepPrevious ?? false);
  onDiff(line);
  return doc;
}

/**
 * Watch rootDir and commit a new generation on every real change. Uses
 * recursive fs.watch on platforms that support it (win32/darwin): events are
 * debounced 120 ms and every rebuild re-hashes content, so a spurious event
 * costs only an empty generation (skipped), never a wrong one. A missed event
 * cannot go stale: the poll driver also runs every watchdogMs (default
 * 5000 ms) as a periodic reconcile, and commits any drift it finds under the
 * 'watchdog' trigger (no-op sweeps stay silent). Polling (default 2000 ms) is
 * the fallback when recursive watch is unavailable — per §6.3 "watcher
 * unavailable → polling sweep" (trigger 'poll') — or forced via pollMs.
 * Resolves with a handle once the initial generation is committed; rejects on
 * a bad root/state dir before any watcher starts.
 */
export async function startWatch(opts: WatchOptions, onDiff: (d: GenerationDiff) => void): Promise<WatchHandle> {
  const log = opts.log ?? (() => {});
  // §6.2: one parse cache per watch session — carried across every generation
  // (init fills it; later generations reuse whatever did not change).
  const parseCache: ParseReuseCache = new Map();
  // Initial generation: diff against whatever the state dir already holds, so
  // edits made while the watcher was down surface as one real diff, not noise.
  let prevDoc = loadStateDoc(opts.stateDir);
  try {
    prevDoc = await buildGeneration(opts, onDiff, 'init', prevDoc, parseCache);
  } catch (err) {
    throw new Error(`initial index build failed (${opts.rootDir}): ${err instanceof Error ? err.message : String(err)}`);
  }

  let stopped = false;
  let busy = false;
  let pending: DiffTrigger | null = null;
  let reconcileTimer: ReturnType<typeof setInterval> | null = null;
  let watcher: ReturnType<typeof watch> | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  async function rebuild(trigger: DiffTrigger): Promise<void> {
    if (busy) {
      pending = trigger;
      return;
    }
    busy = true;
    try {
      const next = await buildGeneration(opts, onDiff, trigger, prevDoc, parseCache);
      if (next !== prevDoc) prevDoc = next;
    } catch (err) {
      log(`build failed (${trigger}): ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      busy = false;
      if (pending && !stopped) {
        const t = pending;
        pending = null;
        void rebuild(t);
      }
    }
  }

  const triggerFromEvents = (): void => {
    if (stopped) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void rebuild('watch'), DEBOUNCE_MS);
  };

  const reconcile = (trigger: DiffTrigger) => (): void => {
    if (stopped || busy || debounce) return; // a rebuild is in flight or due
    try {
      const gitignore = readFileSync(join(opts.rootDir, '.gitignore'), 'utf8');
      const matcher = parseGitignore(gitignore);
      const seen = new Map<string, string>();
      for (const d of discoverFiles({ rootDir: opts.rootDir, matcher })) {
        if (!isDeniedDir(d.path)) seen.set(d.path, d.hash);
      }
      // Synthetic doc: only the files array is consulted by fileDrift.
      const manifest = { files: [...seen.entries()].map(([path, hash]) => ({ path, hash })) } as unknown as DumpDoc;
      const drift = fileDrift(prevDoc, manifest);
      if (drift.added.length > 0 || drift.changed.length > 0 || drift.removed.length > 0) void rebuild(trigger);
    } catch (err) {
      log(`reconcile (${trigger}) failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  const pollTick = reconcile('poll');
  const watchdogTick = reconcile('watchdog');

  const pollForced = (opts.pollMs ?? 0) > 0;
  const pollMs = opts.pollMs && opts.pollMs > 0 ? opts.pollMs : 2000;
  const watchdogMs = opts.watchdogMs && opts.watchdogMs > 0 ? opts.watchdogMs : 5000;
  if (!pollForced) {
    try {
      watcher = watch(opts.rootDir, { recursive: true }, () => triggerFromEvents());
      watcher.on('error', (err) => {
        log(`recursive fs.watch failed (${err.message}) — falling back to ${pollMs} ms polling`);
        watcher?.close();
        watcher = null;
        if (reconcileTimer) clearInterval(reconcileTimer);
        reconcileTimer = setInterval(pollTick, pollMs);
      });
    } catch (err) {
      log(`recursive fs.watch unavailable here — using ${pollMs} ms polling (§6.3): ${err instanceof Error ? err.message : String(err)}`);
      watcher = null;
    }
  }
  // One reconcile sweep always runs: the poll driver directly (poll-only or
  // fallback mode), or as the staleness watchdog alongside fs.watch.
  reconcileTimer = setInterval(pollForced || watcher === null ? pollTick : watchdogTick, pollForced || watcher === null ? pollMs : watchdogMs);

  return {
    stop(): void {
      stopped = true;
      if (debounce) clearTimeout(debounce);
      if (reconcileTimer) clearInterval(reconcileTimer);
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    },
  };
}

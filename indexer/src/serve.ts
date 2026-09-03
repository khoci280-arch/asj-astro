/**
 * serve.ts — Phase 5/6 query API: a dependency-free node:http server over a
 * QueryIndex. Endpoints (JSON):
 *
 *   GET  /                         endpoint index
 *   GET  /healthz                  { ok: true }
 *   GET  /stats                    counts + epoch + source (build | snapshot:… | state:…)
 *   GET  /resolve?file&line&char   symbol at (line 1-based, char 0-based)
 *   GET  /refs?symId=…             bound references + import sites of a symbol
 *   GET  /search?q=…&limit=…       case-insensitive name/qualified substring search
 *   GET  /deps?file=…&direction=…  module graph: imports (out), dependents (in), both
 *   GET  /deps/cycles[?file=…]   non-trivial module cycles (SCCs, row 8); ?file narrows
 *   GET  /symbols?file=…           file outline: declared symbols + export-surface entries
 *   GET  /violations                repo's own .dependency-cruiser.cjs rules over module edges
 *   GET  /gen                      current generation (epoch) + source
 *   GET  /diff?since=<gen>         committed generations after `since` (bounded history)
 *   POST /rebuild                  rebuild now (live-build serve only: 202, async swap)
 *
 * Errors are JSON: 400 malformed params, 404 unknown route/symId, 405 method,
 * 409 rebuild unsupported (snapshot/state serve). WebSocket push is deferred
 * (§11 row 6 follow-up) — clients poll /gen or /diff instead.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { loadForbidRules, CRUISE_CONFIG, hasCruiseConfig } from './boundary.js';
import type { QueryIndex } from './query.js';
import { cyclesOf, depsOf, fileSymbols, refsOf, resolveAt, searchPage, statsOf, violationsOf } from './query.js';
import type { GenerationDiff } from './watch.js';

/**
 * Mutable request-time state: routes read holder.index on every request, so an
 * in-flight generation swap (state-dir refresh or POST /rebuild) applies from
 * the next request on; requests already in flight drain on the generation they
 * started with (design §4.4 — in-flight queries keep the old generation).
 */
export interface IndexHolder {
  index: QueryIndex;
  source: string;
  /** Committed generations, newest last, bounded (pushHistory). */
  history: GenerationDiff[];
  /** Live-build serve: schedule an async rebuild. Absent on snapshot/state serve. */
  requestRebuild?: () => void;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(text);
}

function parseIntParam(value: string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

async function handle(holder: IndexHolder, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const path = url.pathname;
  const p = url.searchParams;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-methods': 'GET, POST', 'access-control-allow-origin': '*' });
    res.end();
    return;
  }
  if (path === '/rebuild') {
    if (req.method !== 'POST') {
      send(res, 405, { error: 'POST /rebuild schedules an async rebuild (live-build serve only)' });
      return;
    }
    if (!holder.requestRebuild) {
      send(res, 409, { error: 'no rebuild source — this server serves a snapshot or state document' });
      return;
    }
    holder.requestRebuild();
    send(res, 202, { ok: true, rebuilding: true, gen: holder.index.doc.epoch });
    return;
  }
  if (req.method !== 'GET') {
    send(res, 405, { error: 'method not allowed — this API is GET-only (POST /rebuild excepted)' });
    return;
  }
  switch (path) {
    case '/':
    case '/healthz':
      send(res, 200, { ok: true, source: holder.source, endpoints: ['/stats', '/resolve', '/refs', '/search', '/deps', '/deps/cycles', '/symbols', '/violations', '/gen', '/diff', 'POST /rebuild'] });
      return;
    case '/stats':
      send(res, 200, statsOf(holder.index, holder.source));
      return;
    case '/gen': {
      // Per-generation health: files the committed generation poisoned, so a
      // generation committed with a broken file is distinguishable from a
      // healthy one (the fuller degradation ladder is §10, not built).
      const poisoned = holder.index.doc.files.filter((f) => f.poisoned !== undefined);
      send(res, 200, {
        gen: holder.index.doc.epoch,
        source: holder.source,
        poisonedCount: poisoned.length,
        poisoned: poisoned.map((f) => ({ path: f.path, error: f.poisoned!.error })),
      });
      return;
    }
    case '/diff': {
      const since = parseIntParam(p.get('since'));
      if (since === null || Number.isNaN(since)) {
        send(res, 400, { error: 'since must be a non-negative integer generation number' });
        return;
      }
      const currentGen = holder.index.doc.epoch;
      if (since > currentGen) {
        send(res, 400, { error: `since ${since} is in the future — current generation is ${currentGen}` });
        return;
      }
      const retained = holder.history.length > 0 ? holder.history[0].gen : currentGen;
      if (since !== 0 && since < retained) {
        send(res, 400, { error: `generation history is retained from ${retained} — since ${since} is older` });
        return;
      }
      const events = since < currentGen ? holder.history.filter((e) => e.gen > since) : [];
      send(res, 200, { since, currentGen, events });
      return;
    }
    case '/resolve': {
      const file = p.get('file');
      const line = parseIntParam(p.get('line'));
      const char = parseIntParam(p.get('char'));
      // parseIntParam: null = missing, NaN = not a non-negative integer.
      if (file === null || file === '' || line === null || char === null || Number.isNaN(line) || Number.isNaN(char)) {
        send(res, 400, { error: 'file, line (0-based) and char (0-based) are required integers' });
        return;
      }
      send(res, 200, resolveAt(holder.index, file, line, char));
      return;
    }
    case '/refs': {
      const symId = p.get('symId');
      if (symId === null || symId === '') {
        send(res, 400, { error: 'symId query parameter is required' });
        return;
      }
      const view = refsOf(holder.index, symId);
      if (!view.found) {
        send(res, 404, { error: `unknown symId: ${symId}` });
        return;
      }
      send(res, 200, view);
      return;
    }
    case '/search': {
      const q = p.get('q');
      if (q === null || q === '') {
        send(res, 400, { error: 'q query parameter is required' });
        return;
      }
      const limitRaw = parseIntParam(p.get('limit'));
      if (limitRaw !== null && Number.isNaN(limitRaw)) {
        send(res, 400, { error: 'limit must be a non-negative integer' });
        return;
      }
      const page = searchPage(holder.index, q, limitRaw ?? 25);
      send(res, 200, { query: q, total: page.total, truncated: page.truncated, results: page.results });
      return;
    }
    case '/deps/cycles': {
      const file = p.get('file');
      if (file === '') {
        send(res, 400, { error: 'file query parameter, when given, must not be empty' });
        return;
      }
      send(res, 200, cyclesOf(holder.index, file ?? undefined));
      return;
    }
    case '/deps': {
      const file = p.get('file');
      const direction = p.get('direction') ?? 'both';
      if (direction !== 'out' && direction !== 'in' && direction !== 'both') {
        send(res, 400, { error: 'direction must be out, in, or both' });
        return;
      }
      const limitRaw = parseIntParam(p.get('limit'));
      if (limitRaw !== null && Number.isNaN(limitRaw)) {
        send(res, 400, { error: 'limit must be a non-negative integer' });
        return;
      }
      if (file === null || file === '') {
        send(res, 400, { error: 'file query parameter is required' });
        return;
      }
      send(res, 200, depsOf(holder.index, file, direction, limitRaw ?? 100));
      return;
    }
    case '/violations': {
      const rootDir = holder.index.doc.rootDir;
      if (!hasCruiseConfig(rootDir)) {
        send(res, 404, { error: `no ${CRUISE_CONFIG} at ${rootDir} — the config is the rules source (row 8)` });
        return;
      }
      const loaded = await loadForbidRules(rootDir);
      const view = violationsOf(holder.index, loaded.rules);
      send(res, 200, {
        config: loaded.config,
        rootDir,
        rulesEvaluated: loaded.rules.length,
        skippedRules: loaded.skipped,
        gen: view.gen,
        total: view.total,
        errors: view.errors,
        warnings: view.warnings,
        clean: view.errors === 0,
        violations: view.violations,
      });
      return;
    }
    case '/symbols': {
      const file = p.get('file');
      if (file === null || file === '') {
        send(res, 400, { error: 'file query parameter is required' });
        return;
      }
      send(res, 200, fileSymbols(holder.index, file));
      return;
    }
    default:
      send(res, 404, { error: `not found: ${path}` });
  }
}

export function createIndexServer(holder: IndexHolder) {
  return createServer((req, res) => {
    void handle(holder, req, res).catch((err) => {
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });
}

/** Bind on a port (0 → ephemeral) and resolve with the actual port. */
export function bind(server: ReturnType<typeof createIndexServer>, port: number, host = '127.0.0.1'): Promise<number> {
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => {
      const addr = server.address() as AddressInfo;
      done(addr.port);
    });
  });
}

/** Start serving; resolves only when the server closes (CLI keeps the process alive). */
export async function serveIndex(holder: IndexHolder, port: number): Promise<void> {
  const server = createIndexServer(holder);
  const actual = await bind(server, port);
  const s = holder.index.doc.stats;
  console.log(`idx serve (${holder.source}): gen ${holder.index.doc.epoch} · ${s.fileCount} files · ${s.symbolCount} symbols → http://127.0.0.1:${actual}`);
  console.log('  GET /stats · /resolve?file=<path>&line=<0>&char=<0> · /refs?symId=<sym:id> · /search?q=<text> · /deps?file=<path> · /deps/cycles[?file=<path>] · /symbols?file=<path> · /violations · /gen · /diff?since=<gen> · POST /rebuild');
  await new Promise<void>((done) => server.on('close', () => done()));
}

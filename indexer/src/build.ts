/**
 * build.ts — the Phase 0-2 pipeline: discover → parse → resolve → graph.
 *
 * Single-threaded for now (246 files, ~28k LOC, well under the 3 s full-build
 * budget); the worker pool is a Phase 5/9 scaling item.
 */

import { readFileSync } from 'node:fs';
import type { FileNode, IndexStats, Occurrence, ScopeNode, SymbolNode } from '../../docs/code-index-schema.js';
import { discoverFiles, isDeniedDir, parseGitignore } from './discover.js';
import type { ExportRecord, RawImportRecord } from './parse.js';
import { parseFile } from './parse.js';
import { createResolver } from './resolve.js';
import type { ModuleGraph } from './graph.js';
import { buildModuleGraph } from './graph.js';
import { buildExportSurfaces, createExportIndex, type ExportIndex, type ExportSurfaces } from './exportTables.js';
import { bindIndex, type BindResult } from './bind.js';
import { deepMemberBind } from './deep-tier.js';
import type { InitType } from './parse.js';
import type { FileIdx, SymKey } from '../../docs/code-index-schema.js';
import { fileIdx } from './util.js';

export interface BuildResult {
  epoch: number;
  rootDir: string;
  files: FileNode[];
  symbols: SymbolNode[];
  scopes: ScopeNode[];
  occurrences: Occurrence[];
  imports: RawImportRecord[];
  exports: ExportRecord[];
  graph: ModuleGraph;
  /** Phase 3: per-file export surfaces (§4.3). */
  exportSurfaces: ExportSurfaces;
  /** Phase 3: lazy multi-hop export resolution (barrels, alias unwrap). */
  resolveExport: ExportIndex['resolveExport'];
  /** Phase 4: bound references (§4.3). */
  refs: BindResult['refs'];
  /** Phase 4: symbol graph edges (calls/renders/reads/writes/references). */
  symbolEdges: BindResult['edges'];
  /** Phase 4: bindable occurrences that failed to resolve, with reasons (§4.3 step 7). */
  unresolvedRefs: BindResult['unresolved'];
  stats: IndexStats;
}

export interface BuildOptions {
  /** Checker-backed member tier (§9.1): resolves light-unbound Property
   * occurrences through ts.createProgram (≈2.1 s on this tree). Default
   * true; watch opts out ({ deep: false }) to keep generation latency. */
  deep?: boolean;
}

export function buildIndex(rootDirAbs: string, opts: BuildOptions = {}): BuildResult {
  const t0 = performance.now();
  const rootDir = rootDirAbs.replace(/\\/g, '/');

  // Stage 1: discover
  const gitignore = readFileSync(`${rootDir}/.gitignore`, 'utf8');
  const discovered = discoverFiles({ rootDir, matcher: parseGitignore(gitignore) });
  const discoverMs = performance.now() - t0;

  // Assign stable, sorted file indices (deterministic ordinals, design §2.1).
  const files: FileNode[] = discovered.map((d, i) => ({
    id: `file:${d.path}`,
    idx: fileIdx(i),
    path: d.path,
    lookupPath: d.lookupPath,
    lang: d.lang,
    hash: d.hash,
    declHash: d.hash, // replaced by parse below
    exportHash: d.hash, // replaced by parse below
    size: d.size,
    mtime: d.mtime,
    lineIndex: d.lineIndex,
  }));
  const idxByPath = new Map(files.map((f) => [f.path, f.idx]));

  // Stage 2: parse (Tier 1, per file)
  const t2 = performance.now();
  const symbols: SymbolNode[] = [];
  const scopes: ScopeNode[] = [];
  const occurrences: Occurrence[] = [];
  const imports: RawImportRecord[] = [];
  const exports: ExportRecord[] = [];
  const importsByFile = new Map<FileNode['idx'], RawImportRecord[]>();
  const exportsByFile = new Map<FileNode['idx'], ExportRecord[]>();
  const templateTagsByFile = new Map<FileNode['idx'], string[]>();
  const initTypes = new Map<SymKey, InitType[]>();
  const typeScopes = new Map<FileIdx, Map<number, SymKey>>();
  for (const d of discovered) {
    const idx = idxByPath.get(d.path)!;
    const parsed = parseFile({ fileIdx: idx, path: d.path, lang: d.lang, content: d.content });
    const f = files[idx as unknown as number];
    f.declHash = parsed.declHash;
    f.exportHash = parsed.exportHash;
    if (parsed.poisoned) f.poisoned = { error: parsed.poisoned };
    symbols.push(...parsed.symbols);
    scopes.push(...parsed.scopes);
    occurrences.push(...parsed.occurrences);
    imports.push(...parsed.imports);
    exports.push(...parsed.exports);
    importsByFile.set(idx, parsed.imports);
    exportsByFile.set(idx, parsed.exports);
    if (parsed.templateTags) templateTagsByFile.set(idx, parsed.templateTags);
    for (const it of parsed.initTypes) {
      let arr = initTypes.get(it.key);
      if (!arr) initTypes.set(it.key, (arr = []));
      arr.push(...it.types);
    }
    if (parsed.typeScopes.length) typeScopes.set(idx, new Map(parsed.typeScopes.map((t) => [t.scopeKey, t.symKey])));
    if (parsed.templateTags) templateTagsByFile.set(idx, parsed.templateTags);
  }
  const parseMs = performance.now() - t2;

  // Stages 3: resolve + graph + export tables
  const t3 = performance.now();
  const resolver = createResolver({ rootDir, files: files.map((f) => ({ path: f.path, idx: f.idx })) });
  const graph = buildModuleGraph({
    importsByFile,
    exportsByFile,
    templateTagsByFile,
    filePathOf: (idx) => files[idx as unknown as number].path,
    resolver,
  });
  const exportSurfaces = buildExportSurfaces({ files, symbols, exportsByFile, importsByFile, resolver });
  const exportIndex = createExportIndex(exportSurfaces);
  const resolveMs = performance.now() - t3;

  // Stage 4: bind occurrences → references (scope chain + import chase over
  // the graph's resolved records — parse-phase imports/exports stay untouched).
  const t4 = performance.now();
  const bound = bindIndex({ symbols, scopes, occurrences, exportIndex, resolvedImports: graph.resolvedImports, resolvedReexports: graph.resolvedReexports, initTypes, typeScopes });
  const bindMs = performance.now() - t4;

  // Stage 4.5: checker-backed member tier (deep, §9.1) — appends refs for
  // light-unbound Property occurrences the compiler resolves to an indexed
  // declaration. Degrades to zero refs when no program can be built.
  const t45 = performance.now();
  if ((opts.deep ?? true) === true) {
    const deepRefs = deepMemberBind({ files, symbols, occurrences, refs: bound.refs, rootDir });
    bound.refs.push(...deepRefs);
  }
  const deepMs = performance.now() - t45;

  const stats: IndexStats = {
    fileCount: files.length,
    symbolCount: symbols.length,
    referenceCount: bound.refs.length,
    unresolvedCount: bound.unresolved.length + graph.unresolved.length,
    stageMs: { discover: discoverMs, parse: parseMs, resolve: resolveMs, bind: bindMs, commit: 0, deep: deepMs },
    memoryBytes:
      files.length * 320 +
      symbols.length * 256 +
      scopes.length * 144 +
      occurrences.length * 72 +
      graph.edges.length * 40 +
      bound.edges.length * 40,
  };

  return {
    epoch: 1,
    rootDir,
    files,
    symbols,
    scopes,
    occurrences,
    imports,
    exports,
    graph,
    exportSurfaces,
    resolveExport: exportIndex.resolveExport,
    refs: bound.refs,
    symbolEdges: bound.edges,
    unresolvedRefs: bound.unresolved,
    stats,
  };
}
/**
 * dump.ts — the `idx dump` document: plain, JSON-safe shapes of the whole
 * index. One contract shared by the CLI `dump` command, the `serve
 * --snapshot` loader, and the query layer (query.ts).
 *
 * Key fields stay numeric (`symKey`, `fileIdx`, schema enum constants) so
 * consumers join on the same identities the pipeline uses:
 *   ref.symKey / edge.target / surface entry symKey → symbols[].key
 *   ref.fileIdx / edge.source (sourceKind "file") / importEdges.from → files[].idx
  importEdges.to (number) → files[].idx, or a module id (`ext:`/`asset:`/`unresolved:`)
 *   importEdges[].bindings[].local (named/default) → symbols[] rows of kind ImportBinding;
 * importEdges also carries row-8 astro Renders edges (EdgeType 13, specifier `<Tag>`):
 *   template component tags resolved through the frontmatter import bindings — an
 *   additive kind; loaders/validators must not assume types 3..6 only.
 * Ranges/offsets follow docs/code-index-schema.ts (1-based lines, 0-based chars).
 * `stats.stageMs` is deliberately omitted: wall-clock timings would break the
 * byte-for-byte determinism consumers rely on to hash/cache documents.
 */

import { readFileSync } from 'node:fs';
import type { BuildResult } from './build.js';
import type { DeclRange, LibFile, LibRef, Range, SymbolNode } from '../../docs/code-index-schema.js';

export interface DumpFile {
  id: string;
  idx: number;
  path: string;
  lang: string;
  hash: string;
  declHash: string;
  exportHash: string;
  size: number;
  mtime: number;
  poisoned?: { error: string; at?: Range };
}

export interface DumpSymbol {
  id: string;
  key: number;
  name: string;
  qualified: string;
  kind: number;
  fileIdx: number;
  scopeId: string;
  parentKey?: number;
  decls: DeclRange[];
  exported: boolean;
  exportNames: string[];
  modifiers: SymbolNode['modifiers'];
  centrality: number;
  typeRef?: string;
  detail?: string;
}

export interface DumpRef {
  fileIdx: number;
  symKey: number;
  role: number;
  resolvedVia: string;
  range: Range;
  usedBeforeDecl?: boolean;
  /** Checker-backed member bind (deep tier). */
  deep?: boolean;
}

export interface DumpUnresolved {
  fileIdx: number;
  name: string;
  reason: string;
  range: Range;
}

export interface DumpUnresolvedImport {
  fileIdx: number;
  specifier: string;
  reason: string;
}

export interface DumpEdge {
  source: number;
  sourceKind: 'symbol' | 'file';
  target: number;
  type: number;
  weight: number;
}

export interface DumpSurfaceEntry {
  name: string;
  kind: string;
  symKey?: number;
  localName?: string;
  exportName?: string;
  targetName?: string;
  isTypeOnly?: boolean;
  fromFileIdx?: number;
  excludes?: string[];
}

export interface DumpSurface {
  fileIdx: number;
  exports: DumpSurfaceEntry[];
  starSources: Array<{ fromFileIdx: number; excludes: string[] }>;
}

export interface DumpStats {
  fileCount: number;
  symbolCount: number;
  referenceCount: number;
  /// Checker-confirmed lib/package refs (libs + libRefs collections)
  libRefCount: number;
  /// refs + unresolvedImports (the two unresolved collections in the doc)
  unresolvedCount: number;
  memoryBytes: number;
}

export interface DumpImportEdge {
  /** Importing file. */
  from: number;
  /** Target file idx, or a module id (`ext:…` / `asset:…` / `unresolved:…`). */
  to: number | string;
  /** EdgeType constant (imports / importsType / importsDynamic / reExports). */
  type: number;
  specifier: string;
  /** Per-binding chase data: local binding names introduced by this import
   * clause, the source (exported) name each binds (absent on namespace
   * imports), and the import shape. Absent on legacy snapshots - the query
   * chase then falls back to name-only per-edge matching. */
  bindings?: Array<{ local: string; imported?: string; shape: "named" | "default" | "namespace" }>;
}

export interface DumpDoc {
  epoch: number;
  rootDir: string;
  stats: DumpStats;
  files: DumpFile[];
  symbols: DumpSymbol[];
  refs: DumpRef[];
  /** Checker-confirmed lib/package declaration files (additive: legacy
   * snapshots without libs/libRefs load unchanged). */
  libs: LibFile[];
  libRefs: LibRef[];
  unresolved: DumpUnresolved[];
  unresolvedImports: DumpUnresolvedImport[];
  symbolEdges: DumpEdge[];
  importEdges: DumpImportEdge[];
  exportSurfaces: DumpSurface[];
}

/** Serialize a build into the dump document (content-deterministic). */
export function dumpDoc(r: BuildResult): DumpDoc {
  const symKeys = new Set<number>(r.symbols.map((s) => s.key));
  const libIds = [...new Set(r.libRefs.map((z) => z.libId))].sort();
  const libIdxById = new Map(libIds.map((id, i) => [id, i]));
  return {
    epoch: r.epoch,
    rootDir: r.rootDir,
    stats: {
      fileCount: r.stats.fileCount,
      symbolCount: r.stats.symbolCount,
      referenceCount: r.stats.referenceCount,
      libRefCount: r.stats.libRefCount,
      unresolvedCount: r.stats.unresolvedCount,
      memoryBytes: r.stats.memoryBytes,
    },
    files: r.files.map((f) => ({
      id: f.id,
      idx: f.idx,
      path: f.path,
      lang: f.lang,
      hash: f.hash,
      declHash: f.declHash,
      exportHash: f.exportHash,
      size: f.size,
      mtime: f.mtime,
      ...(f.poisoned ? { poisoned: f.poisoned } : {}),
    })),
    symbols: r.symbols.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      qualified: s.qualified,
      kind: s.kind,
      fileIdx: s.fileIdx,
      scopeId: s.scopeId,
      ...(s.parentKey !== undefined ? { parentKey: s.parentKey } : {}),
      decls: s.decls,
      exported: s.exported,
      exportNames: s.exportNames,
      modifiers: s.modifiers,
      centrality: s.centrality,
      ...(s.typeRef !== undefined ? { typeRef: s.typeRef } : {}),
      ...(s.detail !== undefined ? { detail: s.detail } : {}),
    })),
    refs: r.refs.map((z) => ({
      fileIdx: z.fileIdx,
      symKey: z.symKey,
      role: z.role,
      resolvedVia: z.resolvedVia,
      range: z.range,
      ...(z.usedBeforeDecl ? { usedBeforeDecl: true } : {}),
      ...(z.deep ? { deep: true } : {}),
    })),
    libs: libIds.map((id, i) => ({ idx: i, id })),
    libRefs: r.libRefs.map((z) => ({ fileIdx: z.fileIdx, range: z.range, name: z.name, libIdx: libIdxById.get(z.libId)!, libName: z.libName })),
    unresolved: r.unresolvedRefs.map((u) => ({ fileIdx: u.fileIdx, name: u.name, reason: u.reason, range: u.range })),
    unresolvedImports: r.graph.unresolved.map((u) => ({ fileIdx: u.from, specifier: u.specifier, reason: u.reason })),
    symbolEdges: r.symbolEdges.map((e) => ({
      source: e.source,
      sourceKind: symKeys.has(e.source as unknown as number) ? 'symbol' : 'file',
      target: e.target,
      type: e.type,
      weight: e.weight,
    })),
    importEdges: r.graph.edges.map((e) => ({ from: e.from, to: e.to, type: e.type, specifier: e.specifier, ...(e.bindings ? { bindings: e.bindings } : {}) })),
    exportSurfaces: [...r.exportSurfaces.entries()].map(([fileIdx, surface]) => ({
      fileIdx,
      exports: [...surface.table.entries()].map(([name, entry]) => ({ name, ...entry } as DumpSurfaceEntry)),
      starSources: surface.starSources,
    })),
  };
}

/**
 * Read + structurally validate an `idx dump` snapshot written by dumpDoc()
 * (the `idx dump` command). Throws with the file's own error text on I/O or
 * JSON failures; throws a shape error when the document is not a dump doc.
 * This module owns the document contract end to end: serialize here, load
 * here — no other file knows the shape.
 */
export function loadSnapshot(path: string): DumpDoc {
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`snapshot load failed (${path}): ${err instanceof Error ? err.message : String(err)}`);
  }
  const d = doc as Partial<DumpDoc>;
  if (
    typeof d.rootDir !== 'string' ||
    !Array.isArray(d.files) ||
    !Array.isArray(d.symbols) ||
    !Array.isArray(d.refs) ||
    !Array.isArray(d.unresolved) ||
    !Array.isArray(d.symbolEdges) ||
    !Array.isArray(d.exportSurfaces)
  ) {
    throw new Error(`invalid snapshot (${path}): expected an idx dump document (run \`idx dump\`)`);
  }
  return doc as DumpDoc;
}

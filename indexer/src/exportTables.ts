/**
 * exportTables.ts — Phase 3: per-file export tables + lazy cross-file resolution.
 *
 * Builds, from parse-level ExportRecords + symbols, the per-file surface:
 *
 *   table        Map<exportName, ExportEntry>  — direct / alias / default /
 *                                                typeOnly / reExport entries
 *   starSources  `export * from` list, consulted lazily
 *
 * `resolveExport(fileIdx, name)` follows TS semantics (§4.3):
 *   - a file's own explicit entry wins over anything `export *` provides;
 *   - `reExport` entries jump to the target file (barrel multi-hop, alias
 *     unwrap: `handleSubmitMasterForm as handleSimpanUpdateMaster`);
 *   - `export *` never re-exports a target's `default`;
 *   - two star sources providing the same name → `ambiguous` with both
 *     candidates retained — never a guessed winner;
 *   - cycles terminate via a per-call seen set; results are memoized per
 *     (fileIdx, name) since tables are immutable within a build.
 *
 * Phase 3 stops at the boundary where the export name binds to a *symbol in
 * this repo* — for the catalog `mapForm` alias that is `_mapForm`'s import
 * binding in repository.ts (the design's `refs(_mapForm)` semantics). Chasing
 * an import binding through the target file is Phase 4 binding.
 */

import { ImportKind, SymbolKind, type ExportEntry, type ExportTable, type FileIdx, type SymKey, type SymbolNode } from '../../docs/code-index-schema.js';
import type { ExportRecord, RawImportRecord } from './parse.js';
import type { Resolver } from './resolve.js';
import { fileIdx } from './util.js';

/** Per-file export surface: named entries + lazy `export *` sources. */
export interface ExportSurface {
  table: ExportTable;
  starSources: Array<{ fromFileIdx: FileIdx; excludes: string[] }>;
}

export type ExportSurfaces = Map<FileIdx, ExportSurface>;

export interface BuildExportSurfacesInput {
  /** Path + idx for every file (for resolving `from` specifiers). */
  files: Array<{ path: string; idx: FileIdx }>;
  symbols: SymbolNode[];
  exportsByFile: Map<FileIdx, ExportRecord[]>;
  importsByFile: Map<FileIdx, RawImportRecord[]>;
  resolver: Resolver;
}

export interface ExportIndex {
  surfaces: ExportSurfaces;
  /**
   * Resolve an export name to the entry that carries the defining symbol
   * (`direct` | `alias` | `default` | `typeOnly`), or `ambiguous`, or null.
   */
  resolveExport(fileIdx: FileIdx, name: string): ExportEntry | null;
}

/**
 * Build the export surface of every file. `from` specifiers are resolved
 * through the Phase 2 resolver; non-file targets (ext/asset/unresolved)
 * produce no entry — nothing in-repo can bind to them.
 */
export function buildExportSurfaces(input: BuildExportSurfacesInput): ExportSurfaces {
  const pathByIdx = new Map(input.files.map((f) => [f.idx, f.path]));
  const symbolsByFile = new Map<FileIdx, SymbolNode[]>();
  const nameToKeys = new Map<FileIdx, Map<string, SymKey[]>>();
  for (const s of input.symbols) {
    let arr = symbolsByFile.get(s.fileIdx);
    if (!arr) symbolsByFile.set(s.fileIdx, (arr = []));
    arr.push(s);
    let nm = nameToKeys.get(s.fileIdx);
    if (!nm) nameToKeys.set(s.fileIdx, (nm = new Map()));
    let ks = nm.get(s.name);
    if (!ks) nm.set(s.name, (ks = []));
    ks.push(s.key);
  }
  const symByKey = new Map(input.symbols.map((s) => [s.key, s]));

  /** SymKey of the local declaration `localName` — prefer one exported under `exportName`. */
  const localSymKey = (f: FileIdx, localName: string, exportName: string): SymKey | undefined => {
    const keys = nameToKeys.get(f)?.get(localName);
    if (!keys?.length) return undefined;
    const preferred = keys.find((k) => symByKey.get(k)?.exportNames.includes(exportName));
    return preferred ?? keys[0];
  };

  /** Anonymous `export default <expression>`: find the decl inside the record's range. */
  const anonDefaultSymKey = (f: FileIdx, rec: ExportRecord): SymKey | undefined => {
    if (!rec.range) return undefined;
    const candidates = symbolsByFile.get(f) ?? [];
    for (const s of candidates) {
      if (s.name !== '<anonymous>') continue;
      const d = s.decls[0];
      if (d.start >= rec.range.start && d.end <= rec.range.end) return s.key;
    }
    return undefined;
  };

  /**
   * Same-file `export { x }` where x is an IMPORTED name (`import { x } from
   * './y'; export { x };`) must keep resolving through y — the compiler's alias
   * chain does, and stopping at the ImportBinding is a wrong import hop (§13).
   * Emit a reExport jump instead of a local entry; namespace imports (`* as
   * ns`) and bare packages stay local (Tier 1 boundary).
   */
  const importJump = (f: FileIdx, sym: SymbolNode, isTypeOnly: boolean): ExportEntry | undefined => {
    const rec = input.importsByFile.get(f)?.find((r) => r.bindings?.some((b) => b.local === sym.name));
    if (!rec || rec.kind === ImportKind.SideEffect) return undefined;
    const b = rec.bindings?.find((x) => x.local === sym.name);
    if (!b || b.shape === 'namespace') return undefined;
    const target = input.resolver.resolve(pathByIdx.get(f) ?? '', rec.specifier);
    if (target.kind !== 'file') return undefined;
    return {
      kind: 'reExport',
      fromFileIdx: target.fileIdx,
      targetName: b.shape === 'default' ? 'default' : b.imported ?? b.local,
      isTypeOnly: isTypeOnly || !!sym.modifiers.isTypeOnly,
    };
  };

  const surfaces: ExportSurfaces = new Map();
  for (const [f, records] of input.exportsByFile) {
    const table: ExportTable = new Map();
    const starSources: ExportSurface['starSources'] = [];

    const put = (name: string, entry: ExportEntry): void => {
      if (!table.has(name)) table.set(name, entry); // first wins; TS rejects duplicates anyway
    };

    for (const rec of records) {
      if (rec.kind === 'cjs') continue; // exports.handler = … — no bindable symbol yet
      const fromFile =
        rec.from !== undefined
          ? (() => {
              const t = input.resolver.resolve(pathByIdx.get(f) ?? '', rec.from);
              return t.kind === 'file' ? t.fileIdx : undefined;
            })()
          : undefined;

      if (rec.kind === 'star') {
        if (fromFile !== undefined) starSources.push({ fromFileIdx: fromFile, excludes: [] });
        continue;
      }

      if (rec.from !== undefined) {
        // `export { x } from './y'` — possibly aliased (localName ≠ exportName),
        // possibly type-only. Resolution continues in fromFile.
        if (fromFile !== undefined) {
          const targetName = rec.localName ?? rec.exportName;
          put(rec.exportName, {
            kind: 'reExport',
            fromFileIdx: fromFile,
            targetName,
            isTypeOnly: rec.kind === 'type',
          });
        }
        continue;
      }

      // Local exports.
      if (rec.kind === 'default') {
        if (rec.localName !== undefined) {
          const key = localSymKey(f, rec.localName, rec.exportName);
          if (key !== undefined) put(rec.exportName, { kind: 'default', symKey: key });
        } else {
          const key = anonDefaultSymKey(f, rec);
          if (key !== undefined) put(rec.exportName, { kind: 'default', symKey: key });
        }
        continue;
      }

      if (rec.kind === 'type') {
        const key = rec.localName !== undefined ? localSymKey(f, rec.localName, rec.exportName) : undefined;
        if (key !== undefined) {
          const sym = symByKey.get(key);
          if (sym?.kind === SymbolKind.ImportBinding) {
            const jump = importJump(f, sym, true);
            if (jump) {
              put(rec.exportName, jump);
              continue;
            }
          }
          put(rec.exportName, { kind: 'typeOnly', symKey: key, localName: rec.localName ?? rec.exportName });
        }
        continue;
      }

      // kind 'named' without `from`: `export function foo` / `export const K`
      // or same-file `export { _mapForm as mapForm }`. If the local symbol is
      // an import binding, keep resolving through its source file.
      if (rec.localName === undefined) continue;
      const key = localSymKey(f, rec.localName, rec.exportName);
      if (key === undefined) continue;
      const sym = symByKey.get(key);
      if (sym?.kind === SymbolKind.ImportBinding) {
        const jump = importJump(f, sym, false);
        if (jump) {
          put(rec.exportName, jump);
          continue;
        }
      }
      if (rec.exportName === rec.localName) {
        put(rec.exportName, { kind: 'direct', symKey: key, localName: rec.localName });
      } else {
        put(rec.exportName, { kind: 'alias', symKey: key, localName: rec.localName, exportName: rec.exportName });
      }
    }

    surfaces.set(f, { table, starSources });
  }
  return surfaces;
}

export function createExportIndex(surfaces: ExportSurfaces): ExportIndex {
  const memo = new Map<string, ExportEntry | null>();

  function resolve(f: FileIdx, name: string, seen: Set<FileIdx>): ExportEntry | null {
    if (seen.has(f)) return null; // cycle guard
    const memoKey = `${f}|${name}`;
    const hit = memo.get(memoKey);
    if (hit !== undefined) return hit;

    const localSeen = new Set(seen);
    localSeen.add(f);
    const surface = surfaces.get(f);
    if (!surface) {
      memo.set(memoKey, null);
      return null;
    }

    // 1. Explicit entries are authoritative — reExport chains one hop deeper.
    const entry = surface.table.get(name);
    if (entry) {
      let result: ExportEntry | null = entry;
      if (entry.kind === 'reExport') {
        result = resolve(entry.fromFileIdx, entry.targetName, localSeen);
      }
      memo.set(memoKey, result);
      return result;
    }

    // 2. No explicit entry → collect across `export *` sources (TS semantics:
    //    stars never re-export a target's `default`).
    type KeyedEntry = Extract<ExportEntry, { symKey: SymKey }>;
    const found: Array<{ entry: KeyedEntry; fromFileIdx: FileIdx }> = [];
    for (const src of surface.starSources) {
      const sub = resolve(src.fromFileIdx, name, localSeen);
      if (!sub) continue;
      if (sub.kind === 'default') continue;
      if (sub.kind === 'ambiguous') {
        for (const c of sub.candidates) {
          found.push({ entry: { kind: 'direct', symKey: c.symKey, localName: name }, fromFileIdx: c.fromFileIdx });
        }
        continue;
      }
      if (sub.kind === 'star' || sub.kind === 'reExport') continue; // resolve() flattens these
      found.push({ entry: sub, fromFileIdx: src.fromFileIdx });
    }

    // Dedupe by symKey: two sources re-exporting the *same* symbol are one.
    const uniq = new Map<SymKey, { entry: Extract<ExportEntry, { symKey: SymKey }>; fromFileIdx: FileIdx }>();
    for (const f2 of found) if (!uniq.has(f2.entry.symKey)) uniq.set(f2.entry.symKey, f2);
    const list = [...uniq.values()];

    let result: ExportEntry | null = null;
    if (list.length === 1) {
      result = list[0].entry;
    } else if (list.length > 1) {
      result = { kind: 'ambiguous', candidates: list.map((x) => ({ symKey: x.entry.symKey, fromFileIdx: x.fromFileIdx })) };
    }
    memo.set(memoKey, result);
    return result;
  }

  return {
    surfaces,
    resolveExport: (f, name) => resolve(f, name, new Set()),
  };
}

/**
 * The defining symKey of a resolved export entry, or null. `resolveExport`
 * never returns `star`/`reExport` (both are flattened internally), so this
 * narrows the union for consumers.
 */
export function exportSymKey(entry: ExportEntry | null): SymKey | null {
  if (!entry) return null;
  switch (entry.kind) {
    case 'direct':
    case 'alias':
    case 'default':
    case 'typeOnly':
      return entry.symKey;
    default:
      return null;
  }
}

/** Convenience for tests/CLI: fileIdx of the file at a repo-relative path. */
export function fileIdxAtPath(files: Array<{ path: string; idx: FileIdx }>, path: string): FileIdx {
  const hit = files.find((f) => f.path === path);
  return hit ? hit.idx : fileIdx(-1);
}
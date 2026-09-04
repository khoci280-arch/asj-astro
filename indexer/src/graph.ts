/**
 * graph.ts — Phase 2: module graph over resolved imports.
 *
 * - `edges` — one entry per import (and re-export `from`), typed
 *   Imports | ImportsType | ImportsDynamic | ReExports, weight 0 until Phase 4
 *   counts symbol references across the edge (design §5.2).
 * - `revDeps` — reverse dependency sets for impact analysis (§6.2 step 5).
 * - `unresolved` — first-class health bucket (§10); Phase 2's exit test is
 *   "zero unresolved relative specifiers".
 * - Astro template tags (row 8): a capitalized `<Tag>` whose local name is
 *   bound by a frontmatter import emits a Renders module edge to that
 *   target; an unbound tag becomes an unresolved record (`template-component`).
 * - Astro.glob calls (row-8 remainder): each frontmatter `Astro.glob('…')`
 *   expands against the indexed inventory into one AstroGlob module edge per
 *   matched file (the raw pattern is the specifier); a pattern that matches
 *   no indexed file becomes an unresolved record (`astro-glob-no-match`).
 * - `resolvedImports` / `resolvedReexports` — parse-phase records with the
 *   Phase-2 resolution attached (a graph-owned copy; parse records are never
 *   mutated). Phase 4 binding chases imports and re-export sites through these.
 */

import { type EdgeType, type FileIdx, EdgeType as EdgeTypeV, ImportKind, type ModuleId, type UnresolvedReason } from '../../docs/code-index-schema.js';
import { matchAstroGlobFiles } from './astroGlob.js';
import type { AstroGlobCall, ExportRecord, RawImportRecord } from './parse.js';
import type { ResolvedTarget, Resolver } from './resolve.js';

export interface ResolvedImportRecord extends RawImportRecord {
  to: FileIdx | ModuleId;
  target: ResolvedTarget;
}

/** An `export … from './y'` record whose specifier resolved to an indexed file. */
export interface ResolvedReexportRecord extends ExportRecord {
  to: FileIdx;
}

export interface ModuleEdge {
  from: FileIdx;
  to: FileIdx | ModuleId;
  type: EdgeType;
  weight: number;
  specifier: string;
  importedNames: string[];
  /** Per-binding chase data: local binding name, the source (exported) name it
   * binds, and the import shape. Present on freshly dumped docs; legacy
   * snapshots omit it and the chase falls back to name-only matching. */
  bindings?: NonNullable<RawImportRecord['bindings']>;
}

export interface UnresolvedImport {
  from: FileIdx;
  specifier: string;
  reason: UnresolvedReason;
}

export interface ModuleGraph {
  edges: ModuleEdge[];
  /** Per-file edges, including re-export edges. */
  outgoing: Map<FileIdx, ModuleEdge[]>;
  /** Reverse dependency sets (file→file only). */
  revDeps: Map<FileIdx, Set<FileIdx>>;
  unresolved: UnresolvedImport[];
  /** Per-file imports with their resolved target — Phase 4's chase input. */
  resolvedImports: Map<FileIdx, ResolvedImportRecord[]>;
  /** Per-file `export … from` records resolved to their target file. */
  resolvedReexports: Map<FileIdx, ResolvedReexportRecord[]>;
}

interface GraphInput {
  importsByFile: Map<FileIdx, RawImportRecord[]>;
  exportsByFile: Map<FileIdx, ExportRecord[]>;
  /** Astro template component tags per file (scanAstroTemplateTags output). */
  templateTagsByFile?: Map<FileIdx, string[]>;
  /** Indexed file inventory (repo-relative path + ordinal) — required to
   * expand Astro.glob patterns into module edges. */
  files?: ReadonlyArray<{ path: string; idx: FileIdx }>;
  /** Astro `Astro.glob('…')` frontmatter calls per file (parse output). Each
   * call emits one AstroGlob module edge per matched file; a pattern with no
   * indexed match becomes an unresolved record. Requires `files`. */
  astroGlobsByFile?: Map<FileIdx, AstroGlobCall[]>;
  filePathOf: (idx: FileIdx) => string;
  resolver: Resolver;
}

export function buildModuleGraph(input: GraphInput): ModuleGraph {
  const edges: ModuleEdge[] = [];
  const outgoing = new Map<FileIdx, ModuleEdge[]>();
  const revDeps = new Map<FileIdx, Set<FileIdx>>();
  const unresolved: UnresolvedImport[] = [];
  const resolvedImports = new Map<FileIdx, ResolvedImportRecord[]>();
  const resolvedReexports = new Map<FileIdx, ResolvedReexportRecord[]>();

  const toId = (target: ResolvedTarget, specifier: string): FileIdx | ModuleId => {
    switch (target.kind) {
      case 'file':
        return target.fileIdx;
      case 'ext':
        return `ext:${target.pkg}`;
      case 'asset':
        return `asset:${target.path}`;
      case 'unresolved':
        return `unresolved:${specifier}`;
    }
  };

  const push = (from: FileIdx, to: FileIdx | ModuleId, type: EdgeType, specifier: string, importedNames: string[], bindings?: NonNullable<RawImportRecord['bindings']>): void => {
    const edge: ModuleEdge = { from, to, type, weight: 0, specifier, importedNames, ...(bindings ? { bindings } : {}) };
    edges.push(edge);
    const list = outgoing.get(from) ?? [];
    list.push(edge);
    outgoing.set(from, list);
    if (typeof to === 'number') {
      const set = revDeps.get(to) ?? new Set<FileIdx>();
      set.add(from);
      revDeps.set(to, set);
    }
  };

  for (const [fromIdx, records] of input.importsByFile) {
    const importerPath = input.filePathOf(fromIdx);
    const resolved: ResolvedImportRecord[] = [];
    for (const rec of records) {
      const target = input.resolver.resolve(importerPath, rec.specifier);
      const to = toId(target, rec.specifier);
      resolved.push({ ...rec, to, target });
      if (target.kind === 'unresolved') unresolved.push({ from: fromIdx, specifier: rec.specifier, reason: target.reason });
      const type: EdgeType = target.kind === 'asset' ? EdgeTypeV.Imports : rec.kind === ImportKind.Type ? EdgeTypeV.ImportsType : rec.kind === ImportKind.Dynamic ? EdgeTypeV.ImportsDynamic : EdgeTypeV.Imports;
      push(fromIdx, to, type, rec.specifier, rec.importedNames, rec.bindings);
    }
    resolvedImports.set(fromIdx, resolved);
    // Astro template tags: resolve each capitalized tag through the frontmatter
    // import bindings (the same local-name mapping the binder uses). A bound
    // tag emits a Renders module edge; an unbound one is an unresolved
    // record — a template referencing a component it never imported is an
    // Astro compile error, so this is a real health signal, not noise.
    for (const tag of input.templateTagsByFile?.get(fromIdx) ?? []) {
      const rec = records.find((r) => r.bindings?.some((b) => b.local === tag));
      if (!rec) {
        unresolved.push({ from: fromIdx, specifier: "<" + tag + ">", reason: "template-component" });
        continue;
      }
      const target = input.resolver.resolve(importerPath, rec.specifier);
      if (target.kind === "file") push(fromIdx, target.fileIdx, EdgeTypeV.Renders, "<" + tag + ">", [tag]);
    }
  }

  for (const [fromIdx, records] of input.exportsByFile) {
    const importerPath = input.filePathOf(fromIdx);
    const reexports: ResolvedReexportRecord[] = [];
    for (const rec of records) {
      if (!rec.from) continue; // direct exports have no module edge
      const target = input.resolver.resolve(importerPath, rec.from);
      if (target.kind === 'unresolved') unresolved.push({ from: fromIdx, specifier: rec.from, reason: target.reason });
      if (target.kind === 'file') reexports.push({ ...rec, to: target.fileIdx });
      push(fromIdx, toId(target, rec.from), EdgeTypeV.ReExports, rec.from, rec.exportName === '*' ? [] : [rec.exportName]);
    }
    resolvedReexports.set(fromIdx, reexports);
  }

  // Astro.glob expansion (row-8 remainder): a frontmatter glob call is a
  // wildcard module dependency — one module edge per matched file, resolved
  // against the indexed inventory (the raw pattern is the specifier, so the
  // wildcard stays visible to consumers). A pattern that matches no indexed
  // file surfaces as an unresolved record — a dead or out-of-universe
  // dependency is a real health signal, never a silent no-op. Edges carry no
  // bindings: a glob imports whole modules, not names, so the binding chase
  // can never claim a symbol through one of these edges.
  if (input.astroGlobsByFile && input.files) {
    for (const [fromIdx, calls] of input.astroGlobsByFile) {
      const importerPath = input.filePathOf(fromIdx);
      for (const call of calls) {
        const hits = matchAstroGlobFiles(call.pattern, importerPath, input.files);
        if (hits.length === 0) {
          unresolved.push({ from: fromIdx, specifier: call.pattern, reason: 'astro-glob-no-match' });
          continue;
        }
        for (const to of hits) push(fromIdx, to, EdgeTypeV.AstroGlob, call.pattern, [], []);
      }
    }
  }

  return { edges, outgoing, revDeps, unresolved, resolvedImports, resolvedReexports };
}
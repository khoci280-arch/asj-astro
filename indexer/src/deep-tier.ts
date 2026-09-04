/**
 * deep-tier.ts — the checker-backed member tier (§9.1, row-9 remainder) +
 * the lib tier (§4.3 open remainder: lib.dom/lib.es tables).
 *
 * Member half: for Property occurrences the light tier leaves unbound, build
 * a ts.createProgram over the inventory and ask the compiler what the
 * receiver binds to. A ref is emitted ONLY when the compiler's declaration
 * maps 1:1 onto an indexed symbol (exact decl-offset join) and the member
 * name matches — never a guess. Emitted refs carry resolvedVia 'type' +
 * deep: true (additive dump field; legacy snapshots without it load
 * unchanged).
 *
 * Lib half: the same checker answers also dissolve the `lib-not-loaded`
 * bucket — two classes graduate to lib refs (resolvedVia-less rows carrying
 * the lib file + qualified name, since lib declarations are not repo
 * symbols): (a) unresolved `lib-not-loaded` value refs (String, JSON,
 * console…) whose identifier the compiler binds to a lib/package
 * declaration of the same name, and (b) light-unbound Property occurrences
 * the compiler binds outside the repo (console.log → Console.log,
 * document.createElement → Document.createElement). Framework globals with
 * no lib declaration (Astro) stay unresolved. Deterministic: libIds are
 * paths relative to node_modules, refs are sorted like deep refs.
 *
 * Cost: program creation ≈ 2.1 s on this tree vs ≈ 0.6 s for the whole
 * light build, so buildIndex defaults the tier ON (one-shot build/serve
 * get the full surface) while watch opts out ({ deep: false }) to keep
 * generation latency. Degradation: any program failure (missing tsconfig,
 * load errors) yields zero deep refs — the tier is additive, never
 * load-bearing.
 *
 * deepTierReport() keeps the measurement mode: it scans what the LIGHT tier
 * leaves unbound and categorizes the compiler's answer — with the tier
 * wired, the joinable bucket is emitted by buildIndex itself and the
 * lib-or-package bucket by the lib pass, so the report sizes the remaining
 * gaps (compiler-none, in-tree-unmappable). Run: node
 * indexer/dist/indexer/src/deep-tier.js
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildIndex } from './build.js';
import { buildProgram, identifierIndex, norm } from './program.js';
import { OccurrenceRole, type FileIdx, type FileNode, type Occurrence, type Range, type SymKey, type SymbolNode, type UnresolvedReference } from '../../docs/code-index-schema.js';
import type { BoundRef } from './bind.js';

const ROOT = process.cwd().replace(/\\/g, '/');

export interface DeepBindParts {
  files: FileNode[];
  symbols: SymbolNode[];
  occurrences: Occurrence[];
  /** Light-tier refs only (the deep pass must not re-emit those offsets). */
  refs: BoundRef[];
  /** Ref-level unresolved rows — the lib pass graduates the `lib-not-loaded` bucket. */
  unresolvedRefs: UnresolvedReference[];
  rootDir: string;
}

/** A lib ref before dump serialization; libIdx is assigned at dump time (libs table dedup). */
export interface LibRefRow {
  fileIdx: FileIdx;
  range: Range;
  name: string;
  /** Deterministic lib file id — libIdOf(). */
  libId: string;
  /** Qualified name inside the lib (e.g. `Console.log`, `JSON`, `process.env`). */
  libName: string;
}

export interface DeepBindOutput {
  /** In-repo checker joins (resolvedVia 'type', deep: true). */
  refs: BoundRef[];
  /** Lib/package binds (no symKey — target is a lib declaration). */
  libRefs: LibRefRow[];
  /** Occurrence keys (`fileIdx:start`) the lib pass graduated — the caller
   * drops those rows from the unresolved bucket. */
  graduated: Set<string>;
}

/** Deterministic lib file id: path relative to node_modules, else basename. */
const libIdOf = (fileName: string): string => {
  const p = norm(fileName);
  const i = p.lastIndexOf('node_modules/');
  return i >= 0 ? p.slice(i + 'node_modules/'.length) : p.split('/').pop() ?? p;
};

/** getFullyQualifiedName embeds absolute paths for module symbols
 * (`"E:/…/node_modules/x".Y.member`) — strip the machine-specific root so
 * libNames are portable across checkouts. */
const cleanLibName = (name: string, rootDir: string): string => {
  const i = name.indexOf(rootDir);
  if (i >= 0 && name[i + rootDir.length] === '/') return name.slice(0, i) + name.slice(i + rootDir.length + 1);
  return name;
};

/**
 * Intrinsic globals the checker binds but reports without declarations
 * (undefined, globalThis) — the lib tier's small tables (§4.3). The lib id
 * is the canonical ES lib the type comes from (ES5 for undefined, ES2020
 * for globalThis); the differential validator still proves the compiler
 * binds the same name at the offset. Everything else in the tier is fully
 * declaration-backed.
 */
const DECLLESS_LIBS = new Map<string, string>([
  ['undefined', 'typescript/lib/lib.es5.d.ts'],
  ['globalThis', 'typescript/lib/lib.es2020.d.ts'],
]);

/**
 * The tier: resolve light-unbound Property occurrences through the checker
 * and graduate the lib-not-loaded bucket. Returns refs + libRefs for the
 * caller (build.ts). Zero output on any program failure — the tier degrades,
 * never throws.
 */
export function deepMemberBind(parts: DeepBindParts): DeepBindOutput {
  const { files, symbols, occurrences, refs, unresolvedRefs, rootDir } = parts;
  const out: BoundRef[] = [];
  const libRefs: LibRefRow[] = [];
  let program: ts.Program | null = null;
  let checker: ts.TypeChecker | null = null;
  let astroOffset: Map<string, number> | null = null;
  try {
    const p = buildProgram(files, rootDir);
    program = p.program;
    checker = p.checker;
    astroOffset = p.astroOffset;
  } catch {
    return { refs: out, libRefs, graduated: new Set() }; // no readable tsconfig / program failure → tier degrades
  }

  const boundStart = new Set<string>();
  for (const ref of refs) boundStart.add(`${ref.fileIdx}:${ref.range.start}`);
  const graduated = new Set<string>();
  const byPath = new Map(files.map((f) => [f.path, f]));
  const declIndex = new Map<string, SymKey>();
  for (const s of symbols) {
    for (const d of s.decls) declIndex.set(`${s.fileIdx}:${d.start}`, s.key);
  }
  const keyToSym = new Map(symbols.map((s) => [s.key, s]));
  const rootN = norm(rootDir) + '/';
  /** Same mapping as validate.ts (astro offsets + name-node decls). The
   * frontmatter offset is the DECLARATION file's — the compiler declaration
   * can live in a different .astro file than the occurrence being resolved
   * (the occurrence's fmOff would shift the join by its own frontmatter). */
  const mapDeclStart = (d: ts.Declaration): number => {
    let start = d.getStart();
    if (ts.isImportSpecifier(d) || ts.isExportSpecifier(d) || ts.isNamespaceImport(d) || ts.isImportClause(d)) {
      start = d.name?.getStart() ?? d.getStart();
    }
    return start + (astroOffset!.get(norm(d.getSourceFile().fileName)) ?? 0);
  };

  const identsCache = new Map<string, Map<number, ts.Identifier>>();
  for (const o of occurrences) {
    if (o.role !== OccurrenceRole.Property) continue;
    if (boundStart.has(`${o.fileIdx}:${o.range.start}`)) continue;
    const f = files[o.fileIdx as unknown as number];
    if (!f) continue;
    const rel = norm(join(rootDir, f.path));
    const sf = program!.getSourceFile(rel);
    if (!sf) continue;
    const fmOff = astroOffset!.get(rel) ?? 0;
    let idents = identsCache.get(rel);
    if (!idents) {
      idents = identifierIndex(sf);
      identsCache.set(rel, idents);
    }
    const id = idents.get(o.range.start - fmOff);
    if (!id) continue;
    let sym: ts.Symbol | undefined;
    try {
      sym = checker!.getSymbolAtLocation(id);
    } catch {
      continue;
    }
    if (!sym) continue;
    // Unwrap alias chains (members re-exported through barrels).
    let alias = sym;
    while ((alias.flags & ts.SymbolFlags.Alias) !== 0) {
      const next = checker!.getAliasedSymbol(alias);
      if (next === alias) break;
      alias = next;
    }
    sym = alias;
    let joinKey: SymKey | undefined;
    let libDecl: ts.Declaration | undefined;
    for (const d of sym.declarations ?? []) {
      // Indexed files only — a declaration under rootDir that is not indexed
      // (node_modules/typescript/lib) is a lib/package target, not a join.
      const relD = norm(d.getSourceFile().fileName);
      const targetFile = relD.startsWith(rootN) ? byPath.get(relD.slice(rootN.length)) : undefined;
      if (targetFile !== undefined) {
        const hit = declIndex.get(`${targetFile.idx}:${mapDeclStart(d)}`);
        if (hit !== undefined) {
          joinKey = hit;
          break;
        }
        continue;
      }
      if (!libDecl) libDecl = d;
    }
    if (joinKey !== undefined) {
      const t = keyToSym.get(joinKey);
      // Never guess: the joined symbol must carry the member name.
      if (!t || t.name !== o.name) continue;
      out.push({ fileIdx: o.fileIdx, range: o.range, symKey: joinKey, role: o.role, resolvedVia: 'type', deep: true });
      continue;
    }
    // Lib/package target: the compiler binds a declaration outside the repo.
    // Emit a lib ref (no symKey — lib declarations are not repo symbols);
    // never a guess: the bound symbol must carry the member name.
    if (libDecl !== undefined && sym.name === o.name) {
      libRefs.push({
        fileIdx: o.fileIdx,
        range: o.range,
        name: o.name,
        libId: libIdOf(libDecl.getSourceFile().fileName),
        libName: cleanLibName(checker!.getFullyQualifiedName(sym), rootDir),
      });
      graduated.add(`${o.fileIdx}:${o.range.start}`);
    }
  }

  // Lib tier, value half: the `lib-not-loaded` bucket (String, JSON, console,
  // document…). For each unresolved row, ask the checker at the same offset;
  // when it binds a lib/package declaration of the same name, the row
  // graduates to a lib ref. Framework globals with no lib declaration (Astro)
  // and genuine binder gaps stay unresolved.
  const libUnByFile = new Map<number, UnresolvedReference[]>();
  for (const u of unresolvedRefs) {
    if (u.reason !== 'lib-not-loaded') continue;
    const fIdx = u.fileIdx as unknown as number;
    const list = libUnByFile.get(fIdx);
    if (list) list.push(u);
    else libUnByFile.set(fIdx, [u]);
  }
  for (const [fIdx, list] of libUnByFile) {
    const f = files[fIdx as unknown as number];
    if (!f) continue;
    const rel = norm(join(rootDir, f.path));
    const sf = program!.getSourceFile(rel);
    if (!sf) continue;
    const fmOff = astroOffset!.get(rel) ?? 0;
    let idents = identsCache.get(rel);
    if (!idents) {
      idents = identifierIndex(sf);
      identsCache.set(rel, idents);
    }
    for (const u of list) {
      const id = idents.get(u.range.start - fmOff);
      if (!id) continue;
      let sym: ts.Symbol | undefined;
      try {
        sym = checker!.getSymbolAtLocation(id);
      } catch {
        continue;
      }
      if (!sym) continue;
      let alias = sym;
      while ((alias.flags & ts.SymbolFlags.Alias) !== 0) {
        const next = checker!.getAliasedSymbol(alias);
        if (next === alias) break;
        alias = next;
      }
      sym = alias;
      if (sym.name !== u.name) continue; // never a guess
      let libDecl: ts.Declaration | undefined;
      let inRepo = false;
      for (const d of sym.declarations ?? []) {
        const relD = norm(d.getSourceFile().fileName);
        const targetFile = relD.startsWith(rootN) ? byPath.get(relD.slice(rootN.length)) : undefined;
        if (targetFile !== undefined) {
          inRepo = true;
          break;
        }
        if (!libDecl) libDecl = d;
      }
      if (inRepo) continue; // binder gap — should have scope-bound; not a lib ref
      if (!libDecl) {
        // Declaration-less: intrinsic globals (undefined, globalThis) get the
        // canonical lib from the small table; framework globals (Astro) stay
        // unresolved.
        const canonical = DECLLESS_LIBS.get(u.name);
        if (canonical === undefined) continue;
        libRefs.push({ fileIdx: u.fileIdx, range: u.range, name: u.name, libId: canonical, libName: u.name });
        graduated.add(`${u.fileIdx}:${u.range.start}`);
        continue;
      }
      libRefs.push({
        fileIdx: u.fileIdx,
        range: u.range,
        name: u.name,
        libId: libIdOf(libDecl.getSourceFile().fileName),
        libName: cleanLibName(checker!.getFullyQualifiedName(sym), rootDir),
      });
      graduated.add(`${u.fileIdx}:${u.range.start}`);
    }
  }

  out.sort((a, b) => a.fileIdx - b.fileIdx || a.range.start - b.range.start || a.symKey - b.symKey);
  libRefs.sort((a, b) => a.fileIdx - b.fileIdx || a.range.start - b.range.start || a.libName.localeCompare(b.libName) || a.libId.localeCompare(b.libId));
  return { refs: out, libRefs, graduated };
}

/**
 * Measurement mode: what would a checker-backed tier beyond the light chase
 * catch? Scans the LIGHT tier's unbound Property occurrences (deep: false,
 * so the wired tier does not pre-empt the scan) and categorizes the
 * compiler's answer per occurrence. Self-checks (exit 1 on violation):
 * every joinable row's target symbol must carry the compiler's declaration
 * offset and match the member name — 0 violations on this tree.
 */
function deepTierReport(rootDir: string): void {
  const r = buildIndex(rootDir, { deep: false });
  const boundStart = new Set<string>();
  for (const ref of r.refs) boundStart.add(`${ref.fileIdx}:${ref.range.start}`);
  const byPath = new Map(r.files.map((f) => [f.path, f]));
  const { program, checker, astroOffset } = buildProgram(r.files, rootDir);

  const declIndex = new Map<string, SymKey>();
  for (const s of r.symbols) {
    for (const d of s.decls) declIndex.set(`${s.fileIdx}:${d.start}`, s.key);
  }
  const keyToSym = new Map(r.symbols.map((s) => [s.key, s]));

  const counts = {
    total: 0,
    inTreeJoinable: 0,
    libOrPackage: 0,
    compilerNone: 0,
    inTreeUnmappable: 0,
    noIdentifier: 0,
  };
  const joinableByTarget = new Map<string, number>();
  const perFile = new Map<string, { total: number; joinable: number; lib: number; none: number; unmappable: number }>();
  const examples: Array<{ path: string; line: number; name: string; cat: string; compiler: string }> = [];

  const occByFile = new Map<number, Occurrence[]>();
  for (const o of r.occurrences) {
    if (o.role !== OccurrenceRole.Property) continue;
    const list = occByFile.get(o.fileIdx);
    if (list) list.push(o);
    else occByFile.set(o.fileIdx, [o]);
  }

  let violations = 0;
  const check = (cond: boolean, msg: string): void => {
    if (!cond) {
      violations++;
      console.error('  [violation] ' + msg);
    }
  };

  /** Same mapping as validate.ts (astro offsets + name-node decls). The
   * frontmatter offset is the DECLARATION file's, as in deepMemberBind. */
  const mapDeclStart = (d: ts.Declaration): number => {
    let start = d.getStart();
    if (ts.isImportSpecifier(d) || ts.isExportSpecifier(d) || ts.isNamespaceImport(d) || ts.isImportClause(d)) {
      start = d.name?.getStart() ?? d.getStart();
    }
    return start + (astroOffset.get(norm(d.getSourceFile().fileName)) ?? 0);
  };

  const rootN = norm(rootDir) + '/';
  for (const rel of r.files.map((f) => f.path)) {
    const f = byPath.get(rel);
    if (!f) continue;
    const sf = program.getSourceFile(norm(join(rootDir, rel)));
    if (!sf) continue;
    const fmOff = astroOffset.get(norm(join(rootDir, rel))) ?? 0;
    const idents = identifierIndex(sf);
    const agg = { total: 0, joinable: 0, lib: 0, none: 0, unmappable: 0 };
    perFile.set(rel, agg);
    for (const o of occByFile.get(f.idx) ?? []) {
      if (boundStart.has(`${f.idx}:${o.range.start}`)) continue;
      counts.total++;
      agg.total++;
      const id = idents.get(o.range.start - fmOff);
      if (!id) {
        counts.noIdentifier++;
        continue;
      }
      let sym = checker.getSymbolAtLocation(id);
      if (!sym) {
        counts.compilerNone++;
        agg.none++;
        continue;
      }
      // Unwrap alias chains (members re-exported through barrels).
      let alias = sym;
      while ((alias.flags & ts.SymbolFlags.Alias) !== 0) {
        const next = checker.getAliasedSymbol(alias);
        if (next === alias) break;
        alias = next;
      }
      sym = alias;
      let joinKey: SymKey | undefined;
      let inRepo = false;
      for (const d of sym.declarations ?? []) {
        // Indexed files only: a declaration under rootDir that is not indexed
        // (node_modules/typescript/lib, @types) is a lib/package target.
        const relD = norm(d.getSourceFile().fileName);
        if (!relD.startsWith(rootN)) continue;
        const targetFile = byPath.get(relD.slice(rootN.length));
        if (!targetFile) continue;
        inRepo = true;
        const hit = declIndex.get(`${targetFile.idx}:${mapDeclStart(d)}`);
        if (hit !== undefined) {
          joinKey = hit;
          break;
        }
      }
      if (joinKey !== undefined) {
        const t = keyToSym.get(joinKey);
        if (!t || t.name !== o.name) {
          check(false, `joinable name mismatch: ${o.name} vs ${t?.name ?? '?'} at ${rel}:${o.range.startLine}`);
          continue;
        }
        counts.inTreeJoinable++;
        agg.joinable++;
        joinableByTarget.set(t.qualified, (joinableByTarget.get(t.qualified) ?? 0) + 1);
        if (examples.length < 20) examples.push({ path: rel, line: o.range.startLine, name: o.name, cat: 'in-tree-joinable', compiler: t.qualified });
      } else if (inRepo) {
        counts.inTreeUnmappable++;
        agg.unmappable++;
        if (examples.length < 20) examples.push({ path: rel, line: o.range.startLine, name: o.name, cat: 'in-tree-unmappable', compiler: sym.name });
      } else {
        counts.libOrPackage++;
        agg.lib++;
        if (examples.length < 20) examples.push({ path: rel, line: o.range.startLine, name: o.name, cat: 'lib-or-package', compiler: sym.name });
      }
    }
  }

  const lines: string[] = [];
  lines.push('=== deep-tier measurement (checker answer for light-unbound member accesses, full inventory) ===');
  lines.push(`root: ${rootDir}`);
  lines.push(`unbound Property occurrences scanned: ${counts.total}`);
  lines.push('');
  lines.push('what does the compiler bind, beyond the light chase?');
  const pct = (n: number): string => (counts.total ? `${Math.round((100 * n) / counts.total)}%` : '0%');
  lines.push(`  in-tree-joinable:     ${counts.inTreeJoinable} (${pct(counts.inTreeJoinable)}) — EMITTED by the wired tier (buildIndex default)`);
  lines.push(`  lib-or-package:       ${counts.libOrPackage} (${pct(counts.libOrPackage)}) — EMITTED as lib refs by the wired tier's lib pass`);
  lines.push(`  lib value refs:       ${r.unresolvedRefs.filter((u) => u.reason === 'lib-not-loaded').length} (lib-not-loaded bucket, graduated by the lib pass)`);
  lines.push(`  compiler-none:        ${counts.compilerNone} (${pct(counts.compilerNone)}) — even the checker binds nothing (any/JS/error code)`);
  lines.push(`  in-tree-unmappable:   ${counts.inTreeUnmappable} (${pct(counts.inTreeUnmappable)})`);
  lines.push(`  no-identifier:        ${counts.noIdentifier}`);
  lines.push('');
  lines.push('per-file (path: total / joinable / lib / none / unmappable):');
  for (const [rel, agg] of perFile) {
    lines.push(`  ${rel}: ${agg.total} / ${agg.joinable} / ${agg.lib} / ${agg.none} / ${agg.unmappable}`);
  }
  lines.push('');
  lines.push('top joinable targets (would-be refs the wired tier now emits, count → target):');
  const top = [...joinableByTarget.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [q, c] of top) lines.push(`  ${c}×  ${q}`);
  lines.push('');
  lines.push(`first ${Math.min(20, examples.length)} example rows:`);
  for (const e of examples) lines.push(`  ${e.path}:${e.line} ${e.name} [${e.cat}] → ${e.compiler}`);
  console.log(lines.join('\n'));
  if (violations > 0) {
    console.error(`${violations} self-check violation(s) — see above`);
    process.exitCode = 1;
  }
}

// Run only when executed directly (dist or src), not when imported by build.ts.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deepTierReport(ROOT);
}

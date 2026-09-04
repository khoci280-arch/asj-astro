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
 * document.createElement → Document.createElement). Framework/intrinsic rows
 * with no same-name compiler declaration — CJS module-wrapper vars
 * (`exports.handler = …`, `module.exports = …`) and the Astro frontmatter
 * global — graduate through dedicated canonical entries pointing at the
 * real declaration in the installed types (@types/node's CJS wrapper vars,
 * astro's AstroGlobal interface). Deterministic: libIds are paths relative
 * to node_modules, refs are sorted like deep refs.
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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { buildIndex } from './build.js';
import { buildProgram, identifierIndex, norm } from './program.js';
import { OccurrenceRole, SymbolKind, type FileIdx, type FileNode, type Occurrence, type Range, type SymKey, type SymbolNode, type UnresolvedReference } from '../../docs/code-index-schema.js';
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
  /** Canonical framework/intrinsic entry (CJS module-wrapper vars, Astro
   * global): the checker binds no same-name declaration, so the differential
   * validator skips the same-name check for these rows (framework rows, not
   * compiler-confirm rows). Build-side only; never serialized. */
  framework?: boolean;
  /** Declaration the ref binds to inside the lib file (1-based line, 0-based
   * char) — the query layer's def/hover target (§8.5). */
  decl?: { line: number; char: number };
  /** SymbolKind of the lib declaration. */
  kind?: number;
  /** Short signature/kind text of the lib declaration (first source line,
   * scanned at build time) — the def/hover detail (§8.5). */
  detail?: string;
  /** OccurrenceRole of the site (Property for member rows, Read/Callee/… for
   * value rows) — the impact answer's per-role breakdown. */
  role?: number;
}

export interface DeepBindOutput {
  /** In-repo checker joins (resolvedVia 'type', deep: true). */
  refs: BoundRef[];
  /** Lib/package binds (no symKey — target is a lib declaration). */
  libRefs: LibRefRow[];
  /** Occurrence keys (`fileIdx:start`) the lib pass graduated — the caller
   * drops those rows from the unresolved bucket. */
  graduated: Set<string>;
  /** Ref rows at GENUINELY merged sites for the caller to rewrite/enrich:
   * occurrence key (`fileIdx:start`) → the site's deterministic primary plus
   * the sibling declaration keys (other indexed symbols whose declarations
   * merge with the target — def/hover shows every merged declaration site).
   * Only sites whose compiler target maps to ≥2 indexed declarations are
   * included — a same-name single-declaration bind is never reassigned, so
   * the rewrite can never fabricate a cross-file claim. */
  merged: Map<string, { symKey: SymKey; merged: SymKey[] }>;
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

/** One canonical lib entry: the declaration file (id), the target name, the
 * schema SymbolKind of the declaration, and the line pattern that finds the
 * declaration in the installed file (deterministic under the lockfile). */
interface CanonicalLib {
  libId: string;
  libName: string;
  kind: number;
  /** Line-start pattern locating the declaration inside the installed file
   * (the decl line/char are scanned at build time — never hardcoded). */
  pattern: RegExp;
}

/**
 * Intrinsic globals the checker binds but reports without declarations
 * (undefined, globalThis) — the lib tier's small tables (§4.3). The lib id
 * is the canonical ES lib the type comes from (ES5 for undefined, ES2020
 * for globalThis). TS ships no physical `declare var` for either (the
 * checker synthesizes them), so these rows carry no decl position — the
 * differential validator still proves the compiler binds the same name at
 * the offset. Everything else in the tier is fully declaration-backed.
 */
const DECLLESS_LIBS = new Map<string, { libId: string; libName: string; kind: number }>([
  ['undefined', { libId: 'typescript/lib/lib.es5.d.ts', libName: 'undefined', kind: SymbolKind.Variable }],
  ['globalThis', { libId: 'typescript/lib/lib.es2020.d.ts', libName: 'globalThis', kind: SymbolKind.Variable }],
]);

/**
 * Framework/intrinsic entries — identifiers whose compiler binding is not a
 * same-name declaration the tier can confirm, so they graduate through a
 * dedicated canonical entry instead: CJS module-wrapper vars (`exports`,
 * `module` in CommonJS files — the checker binds the in-file export
 * property, never the wrapper) and the Astro frontmatter global (the
 * checker binds nothing; Astro injects it per component). Each points at
 * the real declaration in the installed types (@types/node's CJS wrapper
 * vars, astro's AstroGlobal interface), located by scan at build time. The
 * differential validator classifies these as framework rows (no same-name
 * compiler check — it would never agree by construction).
 */
const FRAMEWORK_LIBS = new Map<string, CanonicalLib>([
  ['exports', { libId: '@types/node/module.d.ts', libName: 'exports', kind: SymbolKind.Variable, pattern: /^\s*var exports:/m }],
  ['module', { libId: '@types/node/module.d.ts', libName: 'module', kind: SymbolKind.Variable, pattern: /^\s*var module:/m }],
  ['Astro', { libId: 'astro/dist/types/public/context.d.ts', libName: 'AstroGlobal', kind: SymbolKind.Interface, pattern: /^export interface AstroGlobal\b/m }],
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
    return { refs: out, libRefs, graduated: new Set(), merged: new Map() }; // no readable tsconfig / program failure → tier degrades
  }

  /** Name-node start of a lib declaration in the lib file's own coordinates
   * (lib files are never .astro — no frontmatter offset applies). The name
   * identifier anchors the def/hover click target; nodes without a usable
   * name fall back to the node start. */
  const declPosOf = (d: ts.Declaration): { line: number; char: number } | undefined => {
    try {
      const sf = d.getSourceFile();
      let node: ts.Node = d;
      const name = (d as ts.NamedDeclaration).name;
      if (name !== undefined) {
        if (ts.isIdentifier(name) || ts.isStringLiteral(name)) node = name;
        else if (ts.isComputedPropertyName(name)) node = name.expression;
      }
      const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      return { line: lc.line + 1, char: lc.character };
    } catch {
      return undefined;
    }
  };

  /** Short signature/kind text of a lib declaration: the first line of the
   * declaration's source (the VariableDeclaration text reads `console:
   * Console;`, a MethodDeclaration `log(...data: any[]): void;`), trimmed
   * and capped — the def/hover detail. */
  const declTextOf = (d: ts.Declaration): string | undefined => {
    try {
      const sf = d.getSourceFile();
      const line = sf.text.slice(d.getStart(sf), d.getEnd()).split('\n')[0].trim();
      return line.length === 0 ? undefined : line.length > 100 ? line.slice(0, 97) + '…' : line;
    } catch {
      return undefined;
    }
  };

  /** Schema SymbolKind of a lib declaration node (def/hover rendering). */
  const declKindOf = (d: ts.Declaration): number | undefined => {    switch (d.kind) {
      case ts.SyntaxKind.InterfaceDeclaration: return SymbolKind.Interface;
      case ts.SyntaxKind.ClassDeclaration: return SymbolKind.Class;
      case ts.SyntaxKind.TypeAliasDeclaration: return SymbolKind.TypeAlias;
      case ts.SyntaxKind.EnumDeclaration: return SymbolKind.Enum;
      case ts.SyntaxKind.EnumMember: return SymbolKind.EnumMember;
      case ts.SyntaxKind.FunctionDeclaration: return SymbolKind.Function;
      case ts.SyntaxKind.Constructor: return SymbolKind.Constructor;
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.MethodSignature: return SymbolKind.Method;
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.SetAccessor:
      case ts.SyntaxKind.PropertyDeclaration:
      case ts.SyntaxKind.PropertySignature: return SymbolKind.Property;
      case ts.SyntaxKind.ModuleDeclaration:
        return (d.flags & ts.NodeFlags.Namespace) !== 0 ? SymbolKind.Namespace : SymbolKind.Module;
      case ts.SyntaxKind.VariableDeclaration: {
        const list = d.parent !== undefined && ts.isVariableDeclarationList(d.parent) ? d.parent : undefined;
        return list !== undefined && (list.flags & ts.NodeFlags.Const) !== 0 ? SymbolKind.Constant : SymbolKind.Variable;
      }
      default: return undefined;
    }
  };

  /** Locate a canonical declaration inside an installed types file — scanned
   * from the file at build time (deterministic under the lockfile; never
   * hardcoded line numbers). Returns the decl position plus the matched
   * line's text (the row's short-signature detail). */
  const libTextCache = new Map<string, string>();
  const canonicalDecl = (libId: string, pattern: RegExp): { line: number; char: number; text: string } | undefined => {
    try {
      const abs = norm(join(rootDir, 'node_modules', libId));
      let text = libTextCache.get(abs);
      if (text === undefined) {
        text = readFileSync(abs, 'utf8');
        libTextCache.set(abs, text);
      }
      const m = pattern.exec(text);
      if (m === null) return undefined;
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const lineEnd = text.indexOf('\n', m.index);
      const lineText = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim();
      return { line: text.slice(0, lineStart).split('\n').length, char: m.index - lineStart, text: lineText.slice(0, 100) };
    } catch {
      return undefined;
    }
  };

  /** CJS module-wrapper write: `exports.handler = …` / `module.exports = …`
   * — the identifier is the object of a property access that is the LHS of
   * an assignment. (A genuine local `module`/`exports` would be scope-bound
   * by the light tier and never reach the lib pass.) */
  const isCjsWrapperWrite = (id: ts.Identifier): boolean => {
    const par = id.parent;
    return (
      ts.isPropertyAccessExpression(par) &&
      par.expression === id &&
      ts.isBinaryExpression(par.parent) &&
      par.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      par.parent.left === par
    );
  };

  /** Canonical entry for a residual lib-not-loaded row, or undefined when it
   * is an ordinary global the checker should bind by name. exports/module
   * graduate only when the identifier IS the CJS wrapper write above; Astro
   * only inside .astro frontmatter (Astro injects the global per component). */
  const frameworkEntry = (u: UnresolvedReference, id: ts.Identifier, f: FileNode): CanonicalLib | undefined => {
    if (u.name === 'Astro') return f.lang === 'astro' ? FRAMEWORK_LIBS.get('Astro') : undefined;
    if (u.name === 'exports' || u.name === 'module') return isCjsWrapperWrite(id) ? FRAMEWORK_LIBS.get(u.name) : undefined;
    return undefined;
  };

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
  /** Occurrence key → its compiler target's indexed declaration keys. Ref
   * emission is deferred until the per-site primary is chosen (see below). */
  const joinCands = new Map<string, { fileIdx: FileIdx; range: Range; name: string; bound: boolean; hits: SymKey[] }>();
  for (const o of occurrences) {
    if (o.role !== OccurrenceRole.Property) continue;
    const at = `${o.fileIdx}:${o.range.start}`;
    const alreadyBound = boundStart.has(at);
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
    const hits: SymKey[] = [];
    let libDecl: ts.Declaration | undefined;
    for (const d of sym.declarations ?? []) {
      // Indexed files only — a declaration under rootDir that is not indexed
      // (node_modules/typescript/lib) is a lib/package target, not a join.
      const relD = norm(d.getSourceFile().fileName);
      const targetFile = relD.startsWith(rootN) ? byPath.get(relD.slice(rootN.length)) : undefined;
      if (targetFile !== undefined) {
        const hit = declIndex.get(`${targetFile.idx}:${mapDeclStart(d)}`);
        if (hit !== undefined && !hits.includes(hit)) hits.push(hit);
        continue;
      }
      if (!libDecl) libDecl = d;
    }
    if (hits.length > 0) {
      // Indexed target(s): a compiler symbol whose declarations span several
      // indexed files (intersection-typed member access, interface+interface
      // / namespace+namespace merging) is ONE symbol — every candidate join
      // resolves through the merged group below. Light-bound occurrences join
      // the discovery: when their compiler target maps to ≥2 declarations the
      // caller rewrites the ref onto the group primary (deep.rewrite).
      joinCands.set(at, { fileIdx: o.fileIdx, range: o.range, name: o.name, bound: alreadyBound, hits });
      continue;
    }
    if (alreadyBound) continue; // light-bound, no indexed compiler decl — nothing to add
    // Lib/package target: the compiler binds a declaration outside the repo.
    // Emit a lib ref (no symKey — lib declarations are not repo symbols);
    // never a guess: the bound symbol must carry the member name.
    if (libDecl !== undefined && sym.name === o.name) {
      const dPos = declPosOf(libDecl);
      const dKind = declKindOf(libDecl);
      const dText = declTextOf(libDecl);
      libRefs.push({
        fileIdx: o.fileIdx,
        range: o.range,
        name: o.name,
        libId: libIdOf(libDecl.getSourceFile().fileName),
        libName: cleanLibName(checker!.getFullyQualifiedName(sym), rootDir),
        role: o.role,
        ...(dPos !== undefined ? { decl: dPos } : {}),
        ...(dKind !== undefined ? { kind: dKind } : {}),
        ...(dText !== undefined ? { detail: dText } : {}),
      });
      graduated.add(at);
    }
  }

  // ── merged-declaration joins ──────────────────────────────────────────────
  // A compiler symbol whose declarations map to ≥2 indexed symbols (true
  // interface+interface / namespace+namespace declaration merging across
  // files, and intersection/union-typed member access) is recognized as ONE
  // symbol PER DECLARATION SET: every site whose compiler target maps to the
  // same key set joins the same deterministic primary — the container-
  // qualified member (SessionPayload.exp over an anonymous intersection
  // member `exp`), ties to the smallest key (earliest file). Sites with a
  // single indexed declaration never fold through another site's merge — a
  // same-name bind elsewhere must not reassign them — so validation stays
  // exact (the primary is always a declaration the compiler actually binds
  // at the site).
  const primaryOf = (keys: SymKey[]): SymKey =>
    keys.slice().sort((a, b) => {
      const sa = keyToSym.get(a);
      const sb = keyToSym.get(b);
      const qa = sa !== undefined && sa.qualified !== sa.name ? 0 : 1;
      const qb = sb !== undefined && sb.qualified !== sb.name ? 0 : 1;
      return qa - qb || a - b;
    })[0];
  const siblingsOf = (keys: SymKey[], primary: SymKey): SymKey[] => keys.filter((k) => k !== primary).sort((a, b) => a - b);
  const mergedSites = new Map<string, { symKey: SymKey; merged: SymKey[] }>(); // occurrence key → target + siblings
  for (const [at, c] of joinCands) {
    const target = primaryOf(c.hits);
    if (c.bound) {
      // Light-bound at a genuinely merged site (compiler target maps to ≥2
      // indexed declarations): the caller points the ref at the site's
      // deterministic primary and records the sibling declaration keys.
      if (c.hits.length >= 2) mergedSites.set(at, { symKey: target, merged: siblingsOf(c.hits, target) });
      continue;
    }
    // Deferred join emission: the target is the primary of the site's own
    // declaration set (a single-declaration site targets the declaration
    // itself). Never a guess: the target must carry the member name. A
    // multi-declaration join carries the sibling keys so def/hover shows
    // every merged declaration site.
    const t = keyToSym.get(target);
    if (!t || t.name !== c.name) continue;
    out.push({
      fileIdx: c.fileIdx,
      range: c.range,
      symKey: target,
      role: OccurrenceRole.Property,
      resolvedVia: 'type',
      deep: true,
      ...(c.hits.length >= 2 ? { merged: siblingsOf(c.hits, target) } : {}),
    });
  }

  // Lib tier, value half: the `lib-not-loaded` bucket (String, JSON, console,
  // document…). For each unresolved row, ask the checker at the same offset;
  // when it binds a lib/package declaration of the same name, the row
  // graduates to a lib ref. Framework/intrinsic rows with no same-name
  // compiler declaration (CJS wrapper vars, the Astro frontmatter global)
  // graduate through FRAMEWORK_LIBS (shape-checked); genuine binder gaps stay
  // unresolved.
  // Site role for the lib rows (value rows come from unresolvedRefs, which
  // carry no role — look it up from the occurrence).
  const roleByStart = new Map<string, number>();
  for (const o of occurrences) roleByStart.set(`${o.fileIdx}:${o.range.start}`, o.role);
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
      // Framework/intrinsic rows first: the compiler binds no same-name
      // declaration (the CJS wrapper's export property, or nothing for
      // Astro), so the name-check below could never pass — the canonical
      // entry is the honest answer.
      const fr = frameworkEntry(u, id, f);
      if (fr !== undefined) {
        const decl = canonicalDecl(fr.libId, fr.pattern);
        libRefs.push({
          fileIdx: u.fileIdx,
          range: u.range,
          name: u.name,
          libId: fr.libId,
          libName: fr.libName,
          framework: true,
          role: roleByStart.get(`${u.fileIdx}:${u.range.start}`) ?? 1,
          ...(decl !== undefined ? { decl: { line: decl.line, char: decl.char }, detail: decl.text } : {}),
          kind: fr.kind,
        });
        graduated.add(`${u.fileIdx}:${u.range.start}`);
        continue;
      }
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
        // canonical lib from the small table. TS ships no physical `declare
        // var` for either (the checker synthesizes them), so no decl position
        // is recorded — the target name + lib file are the honest answer.
        const canonical = DECLLESS_LIBS.get(u.name);
        if (canonical === undefined) continue;
        let dText: string | undefined;
        try {
          dText = checker!.typeToString(checker!.getTypeAtLocation(id)).slice(0, 100);
        } catch {
          dText = undefined;
        }
        libRefs.push({
          fileIdx: u.fileIdx,
          range: u.range,
          name: u.name,
          libId: canonical.libId,
          libName: canonical.libName,
          kind: canonical.kind,
          role: roleByStart.get(`${u.fileIdx}:${u.range.start}`) ?? 1,
          ...(dText !== undefined && dText.length > 0 ? { detail: dText } : {}),
        });
        graduated.add(`${u.fileIdx}:${u.range.start}`);
        continue;
      }
      const dPos = declPosOf(libDecl);
      const dKind = declKindOf(libDecl);
      const dText = declTextOf(libDecl);
      libRefs.push({
        fileIdx: u.fileIdx,
        range: u.range,
        name: u.name,
        libId: libIdOf(libDecl.getSourceFile().fileName),
        libName: cleanLibName(checker!.getFullyQualifiedName(sym), rootDir),
        role: roleByStart.get(`${u.fileIdx}:${u.range.start}`) ?? 1,
        ...(dPos !== undefined ? { decl: dPos } : {}),
        ...(dKind !== undefined ? { kind: dKind } : {}),
        ...(dText !== undefined ? { detail: dText } : {}),
      });
      graduated.add(`${u.fileIdx}:${u.range.start}`);
    }
  }

  out.sort((a, b) => a.fileIdx - b.fileIdx || a.range.start - b.range.start || a.symKey - b.symKey);
  libRefs.sort((a, b) => a.fileIdx - b.fileIdx || a.range.start - b.range.start || a.libName.localeCompare(b.libName) || a.libId.localeCompare(b.libId));
  return { refs: out, libRefs, graduated, merged: mergedSites };
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
      const hits: SymKey[] = [];
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
        if (hit !== undefined && !hits.includes(hit)) hits.push(hit);
      }
      if (hits.length > 0) {
        // Merged-declaration targets (one compiler symbol, several indexed
        // files) count as joinable — the wired tier emits to the primary.
        const t = keyToSym.get(hits[0]);
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

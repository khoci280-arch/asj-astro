/**
 * deep-tier.ts — PROTOTYPE: the checker-backed fallback for member accesses
 * the light Tier-2 chase cannot resolve (§9.1, row-9 open remainder). Runs
 * the deterministic 25-file sample through a ts.createProgram and asks the
 * compiler what each UNBOUND Property occurrence binds to, categorizing the
 * answer:
 *   - in-tree-joinable: the compiler's declaration maps 1:1 onto an indexed
 *     symbol — the deep tier could emit these refs (resolvedVia 'type',
 *     checker-backed) today;
 *   - lib-or-package: the compiler binds a lib.d.ts / node_modules symbol —
 *     needs lib tables, the design's open remainder;
 *   - compiler-none: even the checker binds nothing (any-typed receivers,
 *     framework globals, error code);
 *   - in-tree-unmappable: the compiler declares in-repo but no indexed symbol
 *     carries that decl (shorthand props, unusual decl nodes).
 * NOT wired into the pipeline or the dump contract — a measurement prototype.
 * Self-checks (exit 1 on violation): every joinable row's target symbol must
 * carry the compiler's declaration offset, and its name must equal the
 * occurrence's member name.
 *
 * Run: node indexer/dist/indexer/src/deep-tier.js
 */

import { join } from 'node:path';
import ts from 'typescript';
import { buildIndex, type BuildResult } from './build.js';
import { OccurrenceRole, type Occurrence, type SymKey } from '../../docs/code-index-schema.js';
import { SAMPLE, buildProgram, identifierIndex, norm } from './validate.js';

const ROOT = process.cwd().replace(/\\/g, '/');

function deepTierReport(rootDir: string): void {
  const r = buildIndex(rootDir);
  const boundStart = new Set<string>();
  for (const ref of r.refs) boundStart.add(`${ref.fileIdx}:${ref.range.start}`);
  const byPath = new Map(r.files.map((f) => [f.path, f]));
  const { program, checker, astroOffset } = buildProgram(r, rootDir);

  // (fileIdx:declStart) → symKey — the join target for checker declarations.
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

  /** Same mapping as validate.ts's makeIdentityComparator (astro offsets + name-node decls). */
  const mapDeclStart = (d: ts.Declaration, fmOff: number): number => {
    let start = d.getStart();
    if (ts.isImportSpecifier(d) || ts.isExportSpecifier(d) || ts.isNamespaceImport(d) || ts.isImportClause(d)) {
      start = d.name?.getStart() ?? d.getStart();
    }
    return start + fmOff;
  };

  // ── self-checks: every joinable target must carry the compiler's decl
  // offset and match the member name (the refs the deep tier would emit).
  let violations = 0;
  const check = (cond: boolean, msg: string): void => {
    if (!cond) {
      violations++;
      console.error('  [violation] ' + msg);
    }
  };

  for (const rel of SAMPLE) {
    const f = byPath.get(rel);
    if (!f) continue;
    const sf = program.getSourceFile(norm(join(rootDir, rel)));
    if (!sf) continue;
    const fmOff = astroOffset.get(norm(join(rootDir, rel))) ?? 0;
    const idents = identifierIndex(sf);
    const agg = { total: 0, joinable: 0, lib: 0, none: 0, unmappable: 0 };
    perFile.set(rel, agg);
    for (const o of occByFile.get(f.idx) ?? []) {
      if (boundStart.has(`${f.idx}:${o.range.start}`)) continue; // light tier already claimed it
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
        const relD = norm(d.getSourceFile().fileName);
        const rootN = norm(rootDir) + '/';
        const relPath = relD.startsWith(rootN) ? relD.slice(rootN.length) : undefined;
        const targetFile = relPath !== undefined ? byPath.get(relPath) : undefined;
        if (targetFile) {
          inRepo = true;
          const hit = declIndex.get(`${targetFile.idx}:${mapDeclStart(d, fmOff)}`);
          if (hit !== undefined) {
            joinKey = hit;
            break;
          }
        }
      }
      if (joinKey !== undefined) {
        counts.inTreeJoinable++;
        agg.joinable++;
        const t = keyToSym.get(joinKey);
        const q = t ? t.qualified : `#${joinKey}`;
        check(o.name === t!.name, 'joinable target name mismatch: ' + o.name + ' vs ' + t!.name + ' at ' + rel + ':' + o.range.startLine);
        joinableByTarget.set(q, (joinableByTarget.get(q) ?? 0) + 1);
        if (examples.length < 20) examples.push({ path: rel, line: o.range.startLine, name: o.name, cat: 'in-tree-joinable', compiler: q });
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
  lines.push('=== deep-tier prototype (checker-backed member fallback, sample only) ===');
  lines.push(`root: ${rootDir}`);
  lines.push(`sample: ${SAMPLE.length} files · unbound Property occurrences scanned: ${counts.total}`);
  lines.push('');
  lines.push('would the deep tier catch it? (compiler answer per unbound member access)');
  const pct = (n: number): string => (counts.total ? `${Math.round((100 * n) / counts.total)}%` : '0%');
  lines.push(`  in-tree-joinable:     ${counts.inTreeJoinable} (${pct(counts.inTreeJoinable)}) — checker decl maps to an indexed symbol — EMITTABLE today`);
  lines.push(`  lib-or-package:       ${counts.libOrPackage} (${pct(counts.libOrPackage)}) — needs lib tables (design's open remainder)`);
  lines.push(`  compiler-none:        ${counts.compilerNone} (${pct(counts.compilerNone)}) — even the checker binds nothing (any/JS/error code)`);
  lines.push(`  in-tree-unmappable:   ${counts.inTreeUnmappable} (${pct(counts.inTreeUnmappable)})`);
  lines.push(`  no-identifier:        ${counts.noIdentifier}`);
  lines.push('');
  lines.push('per-file (path: total / joinable / lib / none / unmappable):');
  for (const [rel, agg] of perFile) {
    lines.push(`  ${rel}: ${agg.total} / ${agg.joinable} / ${agg.lib} / ${agg.none} / ${agg.unmappable}`);
  }
  lines.push('');
  lines.push('top joinable targets (would-be refs, count → target qualified):');
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

deepTierReport(ROOT);

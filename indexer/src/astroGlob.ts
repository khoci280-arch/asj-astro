/**
 * astroGlob.ts — Astro.glob expansion (roadmap row-8 remainder).
 *
 * `Astro.glob('../pages/*.astro')` is a wildcard module dependency: at index
 * time the pattern expands into one module edge per file it matches instead
 * of an unresolved string (design §2.4). Astro resolves the pattern relative
 * to the importing file's directory — a leading-`/` pattern is repo-root
 * relative, Vite-style — so a candidate file matches when its path relative
 * to that origin satisfies the glob. A wildcard never escapes that origin:
 * candidates outside the importer directory start with `../`, which only a
 * literal `..`-prefix in the pattern itself can match.
 *
 * The matcher implements the fast-glob subset Astro code actually relies on:
 * `*` (any chars within one path segment), `**` (zero or more segments),
 * `?` (one char within a segment), `[...]` character classes (`[!…]`
 * negates), and `{a,b}` alternation. Everything else is matched literally
 * (escaped), matching is case-insensitive like the resolver's file lookup,
 * and candidates come from the indexed inventory only (files, never
 * directories; repo-relative posix paths). Conservative and deterministic:
 * a pattern that matches nothing here is a real health signal — a dead or
 * out-of-universe dependency — and surfaces as an `astro-glob-no-match`
 * unresolved record in graph.ts.
 */

import { posix } from 'node:path';
import type { FileIdx } from '../../docs/code-index-schema.js';

/** Regex metacharacters a literal pattern char must be escaped from. */
const RE_SPECIAL = /[.*+?^${}()|[\]\\]/;

function escapeReChar(c: string): string {
  return RE_SPECIAL.test(c) ? '\\' + c : c;
}

/** Top-level segments of a `{a,b}` / `{a,b,c}` body (depth 0 commas only). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Regex source (unanchored) for one glob pattern — `*`, `**`, `?`, `[...]`,
 * `{a,b}` translate to their fast-glob semantics; unrecognized syntax falls
 * back to an escaped literal so the matcher never over-matches. */
function translateGlob(glob: string): string {
  let out = '';
  let i = 0;
  const n = glob.length;
  while (i < n) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i += 2;
        if (glob[i] === '/') {
          // '**/' — zero or more directory segments ('a/**/b' matches 'a/b').
          out += '(?:[^/]+/)*';
          i++;
        } else {
          // Trailing '**' (or bare '**') — anything, slashes included.
          out += '.*';
        }
      } else {
        // '*' — any chars within one segment, never '/'.
        out += '[^/]*';
        i++;
      }
      continue;
    }
    if (c === '?') {
      out += '[^/]';
      i++;
      continue;
    }
    if (c === '[') {
      // Character class through its ']' ('!' / '^' first negates; a leading
      // ']' is a literal member). Unterminated: treat the '[' literally.
      let j = i + 1;
      if (glob[j] === '!' || glob[j] === '^') j++;
      if (glob[j] === ']') j++;
      while (j < n && glob[j] !== ']') j++;
      if (j >= n) {
        out += '\\[';
        i++;
        continue;
      }
      let body = glob.slice(i + 1, j);
      if (body.startsWith('!') || body.startsWith('^')) body = '^' + body.slice(1);
      out += '[' + body.replace(/\\/g, '\\\\') + ']';
      i = j + 1;
      continue;
    }
    if (c === '{') {
      // Alternation: match the balanced brace, split its body on top-level
      // commas, and translate each alternative (so `*.{ts,tsx}` and nested
      // `*` inside alternatives work). An empty brace body stays literal.
      let depth = 0;
      let j = i;
      for (; j < n; j++) {
        if (glob[j] === '{') depth++;
        else if (glob[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j >= n) {
        out += '\\{';
        i++;
        continue;
      }
      if (j === i + 1) {
        // '{}' — no alternatives: an empty alternation is never intended;
        // keep both braces literal rather than match the empty string.
        out += '\\{\\}';
        i = j + 1;
        continue;
      }
      const alts = splitTopLevel(glob.slice(i + 1, j));
      out += '(?:' + alts.map((a) => translateGlob(a)).join('|') + ')';
      i = j + 1;
      continue;
    }
    out += escapeReChar(c);
    i++;
  }
  return out;
}

/**
 * Compile a glob pattern (relative to a caller-chosen origin) into an
 * anchored, case-insensitive matcher. A leading `./` is an origin-relative
 * no-op and is stripped; the origin itself is chosen by the caller:
 *   - relative pattern  → importer file's directory (Astro semantics),
 *   - leading-`/` pattern → repo root (strip the slash before compiling).
 */
export function compileAstroGlob(pattern: string): RegExp {
  let p = pattern;
  if (p.startsWith('./')) p = p.slice(2);
  return new RegExp('^' + translateGlob(p) + '$', 'i');
}

/**
 * Indexed files an `Astro.glob` call written from `importerPath` matches,
 * ordinals ascending (deterministic edge order). Relative patterns resolve
 * against the importer's directory, leading-`/` patterns against the repo
 * root. Empty result = no indexed file matches — the caller records that as
 * an unresolved health signal, it never throws.
 */
export function matchAstroGlobFiles(
  pattern: string,
  importerPath: string,
  files: ReadonlyArray<{ path: string; idx: FileIdx }>,
): FileIdx[] {
  const p = pattern.trim();
  if (p === '') return [];
  if (p[0] === '/') {
    const matcher = compileAstroGlob(p.slice(1));
    const hits: FileIdx[] = [];
    for (const f of files) if (matcher.test(f.path)) hits.push(f.idx);
    return hits.sort((a, b) => (a as unknown as number) - (b as unknown as number));
  }
  const dir = posix.dirname(importerPath);
  const matcher = compileAstroGlob(p);
  const hits: FileIdx[] = [];
  for (const f of files) {
    const cand = posix.relative(dir, f.path);
    // Wildcards never climb out of the importer's directory: a candidate
    // outside it starts with '../', which only the pattern's own literal
    // '..'-prefix may match (Vite/Astro resolve globs relative to the base
    // and cannot escape it through `**`).
    if (cand.startsWith('../') && !p.startsWith('../')) continue;
    if (matcher.test(cand)) hits.push(f.idx);
  }
  return hits.sort((a, b) => (a as unknown as number) - (b as unknown as number));
}

/**
 * util.ts — shared plumbing for the code index.
 *
 * Path conventions (docs/CODE_INDEX_DESIGN.md §2.1):
 *  - all paths are repo-relative POSIX, original casing for display;
 *  - lookups go through a lowercased copy because this repo lives on NTFS,
 *    which is case-insensitive (`./ApiClient` and `./apiClient` are one file).
 */

import { posix } from 'node:path';
import type { FileIdx, Range, SymKey } from '../../docs/code-index-schema.js';

export type Lang = 'ts' | 'tsx' | 'astro' | 'js' | 'mjs' | 'cjs' | 'sql';

export function fileIdx(n: number): FileIdx {
  return n as unknown as FileIdx;
}

/** Packed physical key: (fileIdx << 20) | declIndex (§3.1 of the design). */
export function symKey(fileIdx: FileIdx, n: number): SymKey {
  return (((fileIdx as unknown as number) << 20) | n) as unknown as SymKey;
}

export function symKeyFile(k: SymKey): FileIdx {
  return fileIdx((k as unknown as number) >>> 20);
}

export function toPosix(p: string): string {
  return p.split('\\').join('/');
}

/** Byte offset of every line start. Powers offset ↔ line/col in O(log n). */
export function buildLineIndex(text: string): Uint32Array {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return Uint32Array.from(starts);
}

export function lineColAt(lineIndex: Uint32Array, offset: number): { line: number; char: number } {
  let lo = 0;
  let hi = lineIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineIndex[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  // 1-based lines: editor coordinates throughout (the dump, CLI, serve,
  // and printed answers share one space; chars stay 0-based as documented).
  return { line: lo + 1, char: offset - lineIndex[lo] };
}

export function makeRange(lineIndex: Uint32Array, start: number, end: number): Range {
  const s = lineColAt(lineIndex, start);
  const e = lineColAt(lineIndex, end);
  return { startLine: s.line, startChar: s.char, endLine: e.line, endChar: e.char, start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Include rules — docs/CODE_INDEX_DESIGN.md §2.1, refined:
//  - netlify/functions/**/*.js is indexed too: the 29 tracked CJS entry points
//    (auth.js, apply.js, …) are first-class sources that `require()` into _lib.
// ─────────────────────────────────────────────────────────────────────────────

const EXT_LANG: Record<string, Lang> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.astro': 'astro',
  '.js': 'js',
  '.mjs': 'mjs',
  '.cjs': 'cjs',
};

export function langOf(rel: string): Lang | null {
  const ext = posix.extname(rel).toLowerCase();
  return EXT_LANG[ext] ?? null;
}

/** Whether a repo-relative posix path belongs in the index. */
export function includePath(rel: string): boolean {
  const lang = langOf(rel);
  if (!lang) return false;
  const dir = posix.dirname(rel);
  if (dir === 'src' || dir.startsWith('src/')) return true;
  if (dir === 'netlify/functions' || dir.startsWith('netlify/functions/')) {
    return lang === 'ts' || lang === 'tsx' || lang === 'js';
  }
  if (dir === 'shared' || dir.startsWith('shared/')) return lang === 'ts';
  // Secondary tier: repo-root scripts + e2e (design §2.1).
  if (dir === 'scripts' || dir.startsWith('scripts/')) return lang === 'mjs' || lang === 'cjs' || lang === 'js';
  if (dir === 'e2e' || dir.startsWith('e2e/')) return lang === 'mjs' || lang === 'cjs' || lang === 'js';
  if (dir === '.') return lang === 'mjs' || lang === 'cjs' || lang === 'js'; // repo root only
  return false;
}
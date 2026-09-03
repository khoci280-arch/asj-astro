/**
 * discover.ts — Phase 0: gitignore-aware walker producing FileRecord inventory.
 *
 * Exclusion order (design §2.1): .gitignore patterns first, then an explicit
 * deny list. The repo has a single small root .gitignore, so a hand-rolled
 * matcher (comments, `!` negation, trailing `/` dir-only, leading `/` anchored,
 * `*`/`**`/`?` globs) is sufficient; the Phase-0 exit test cross-checks the
 * resulting inventory against `git ls-files`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildLineIndex, includePath, langOf, type Lang } from './util.js';
import { hashBytes } from './hash.js';

export interface GitignoreMatcher {
  ignores(relPosixPath: string, isDir: boolean): boolean;
}

interface Pattern {
  re: RegExp;
  negate: boolean;
  dirOnly: boolean;
}

export function parseGitignore(text: string): GitignoreMatcher {
  const patterns: Pattern[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    let negate = false;
    if (line.startsWith('!')) {
      negate = true;
      line = line.slice(1);
    }
    if (!line) continue;
    let dirOnly = false;
    if (line.endsWith('/')) {
      dirOnly = true;
      line = line.slice(0, -1);
    }
    let anchored = false;
    if (line.startsWith('/')) {
      anchored = true;
      line = line.slice(1);
    }
    if (!line) continue;

    let src = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '*') {
        if (line[i + 1] === '*') {
          src += '.*';
          i++;
        } else {
          src += '[^/]*';
        }
      } else if (ch === '?') {
        src += '[^/]';
      } else if ('\\^$.|+()[]{}'.includes(ch)) {
        src += '\\' + ch;
      } else {
        src += ch;
      }
    }
    // Unanchored patterns match at any depth (gitignore semantics); patterns
    // containing a separator (e.g. netlify/functions/.netlify-built/) are
    // relative to the gitignore's directory and thus anchored in practice.
    const re = anchored ? new RegExp('^' + src + '$') : new RegExp('(^|.*/)' + src + '$');
    patterns.push({ re, negate, dirOnly });
  }

  return {
    ignores(rel, isDir) {
      let ignored = false;
      for (const p of patterns) {
        if (p.dirOnly && !isDir) continue;
        if (p.re.test(rel)) ignored = !p.negate; // last matching pattern wins
      }
      return ignored;
    },
  };
}

/** Explicit deny list (§2.1) — belt and suspenders on top of .gitignore. */
const DENY_DIRS = ['node_modules', 'dist', '.astro', '.netlify', '.git', '.workbuddy-ai', '.agents', '.freebuff'];

export function isDeniedDir(rel: string): boolean {
  return DENY_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
}

export interface DiscoverOptions {
  /** Absolute repo root (forward slashes). */
  rootDir: string;
  matcher: GitignoreMatcher;
}

export interface DiscoveredFile {
  /** Repo-relative posix path, original casing (for display / IDs). */
  path: string;
  /** Lowercased copy used for map lookups (NTFS is case-insensitive). */
  lookupPath: string;
  lang: Lang;
  size: number;
  mtime: number;
  /** sha256 truncated to 128 bits — FileNode.hash (§6.1, body-level). */
  hash: string;
  lineIndex: Uint32Array;
  content: string;
}

/** Deterministic: walks directories in sorted order, returns sorted by path. */
export function discoverFiles(opts: DiscoverOptions): DiscoveredFile[] {
  const out: DiscoveredFile[] = [];
  const visit = (absDir: string, relDir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(absDir);
    } catch {
      return;
    }
    entries.sort();
    for (const name of entries) {
      const abs = join(absDir, name);
      const rel = relDir ? `${relDir}/${name}` : name;
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (name === '.git') continue;
        if (opts.matcher.ignores(rel, true)) continue;
        if (isDeniedDir(rel)) continue;
        visit(abs, rel);
      } else if (st.isFile()) {
        if (opts.matcher.ignores(rel, false)) continue;
        if (!includePath(rel)) continue;
        const content = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
        out.push({
          path: rel,
          lookupPath: rel.toLowerCase(),
          lang: langOf(rel)!,
          size: st.size,
          mtime: st.mtimeMs,
          hash: hashBytes(Buffer.from(content, 'utf8')),
          lineIndex: buildLineIndex(content),
          content,
        });
      }
    }
  };
  visit(opts.rootDir, '');
  out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return out;
}
/**
 * resolve.ts — Phase 2: specifier → module, mirroring ts.resolveModuleName for
 * this project's config (design §4.2), in order:
 *
 *   1. strip Vite query suffixes (`sprite.svg?raw`)
 *   2. bare specifier → package (`ext:<pkg>`; node_modules never walked deeply)
 *   3. relative → posix-normalize, then probe `.ts .tsx .d.ts .astro .mjs
 *      .mts .js .jsx`, then `/index.<ext>`; a specifier that already carries a
 *      code extension is probed by swapping the extension instead of appending
 *   4. non-code extensions → `asset:` node
 *   5. `https://` → `unresolved:remote-specifier`
 *   6. tsconfig.paths alias hook — consulted first; empty in this repo
 *
 * Memoized on (importerDir, specifier); invalidated only when files are added
 * or removed in that directory (Phase 6).
 */

import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import type { FileIdx, UnresolvedReason } from '../../docs/code-index-schema.js';

export type ResolvedTarget =
  | { kind: 'file'; fileIdx: FileIdx; path: string }
  | { kind: 'ext'; pkg: string }
  | { kind: 'asset'; path: string }
  | { kind: 'unresolved'; reason: UnresolvedReason; specifier: string };

export interface ResolverOptions {
  rootDir: string; // absolute, forward slashes
  files: Array<{ path: string; idx: FileIdx }>;
}

export interface Resolver {
  resolve(importerPath: string, specifier: string): ResolvedTarget;
}

/** Code extensions probed in order when a specifier/CLI needle has no extension. */
export const PROBE_EXTS = ['.ts', '.tsx', '.d.ts', '.astro', '.mjs', '.mts', '.js', '.jsx'];

/**
 * Case-insensitive file lookup over an indexed path list, sharing the resolver's
 * extension probing: exact path first, then — when the needle already ends in a
 * code extension — a path-suffix match, otherwise `<needle>.<ext>` and
 * `<needle>/index.<ext>` by suffix. `repository` and `contexts/catalog/repository`
 * both resolve; ambiguous needles (e.g. `repository` when many repository.ts
 * exist) return the first hit in list order. Used by the CLI and the query API.
 */
export function probeFilePaths<T extends { path: string }>(paths: ReadonlyArray<T>, needle: string): T | undefined {
  const lower = needle.toLowerCase();
  const exact = paths.find((f) => f.path.toLowerCase() === lower);
  if (exact) return exact;
  const hasCodeExt = PROBE_EXTS.some((e) => lower.endsWith(e));
  if (hasCodeExt) return paths.find((f) => f.path.toLowerCase().endsWith(lower));
  const candidates: string[] = [];
  for (const e of PROBE_EXTS) candidates.push(lower + e);
  for (const e of PROBE_EXTS) candidates.push(`${lower}/index${e}`);
  for (const c of candidates) {
    const hit = paths.find((f) => f.path.toLowerCase() === c || f.path.toLowerCase().endsWith(`/${c}`));
    if (hit) return hit;
  }
  return undefined;
}
const ASSET_RE = /\.(css|svg|png|jpe?g|gif|webp|avif|woff2?|ttf|otf|eot|ico|json|xml|pdf|txt|map)$/i;

/** tsconfig.paths alias hook — empty in this repo, kept as the extension point. */
const ALIASES: Array<{ prefix: string; target: string }> = [];

export function createResolver(opts: ResolverOptions): Resolver {
  const byLookup = new Map<string, { path: string; idx: FileIdx }>();
  for (const f of opts.files) byLookup.set(f.path.toLowerCase(), f);
  const memo = new Map<string, ResolvedTarget>();

  function probe(base: string): ResolvedTarget | null {
    const hit = byLookup.get(base.toLowerCase());
    if (hit) return { kind: 'file', fileIdx: hit.idx, path: hit.path };
    return null;
  }

  function probeWithExts(base: string): ResolvedTarget | null {
    const exact = probe(base);
    if (exact) return exact;
    const ext = posix.extname(base).toLowerCase();
    if (PROBE_EXTS.includes(ext)) {
      const stem = base.slice(0, -ext.length);
      for (const e of PROBE_EXTS) {
        if (e === ext) continue;
        const hit = probe(stem + e);
        if (hit) return hit;
      }
      return null;
    }
    for (const e of PROBE_EXTS) {
      const hit = probe(base + e);
      if (hit) return hit;
    }
    for (const e of PROBE_EXTS) {
      const hit = probe(base + '/index' + e);
      if (hit) return hit;
    }
    return null;
  }

  function resolve(importerPath: string, specifier: string): ResolvedTarget {
    const memoKey = `${importerPath}\u0000${specifier}`;
    const cached = memo.get(memoKey);
    if (cached) return cached;

    let target: ResolvedTarget;

    if (/^https?:\/\//.test(specifier)) {
      target = { kind: 'unresolved', reason: 'remote-specifier', specifier };
    } else {
      const noQuery = specifier.split('?')[0];
      // 6. alias hook (tsconfig.paths) — currently empty.
      const alias = ALIASES.find((a) => noQuery.startsWith(a.prefix));
      if (alias) {
        target = probeWithExts(posix.join(alias.target, noQuery.slice(alias.prefix.length))) ?? {
          kind: 'unresolved',
          reason: 'module-not-found',
          specifier,
        };
      } else if (noQuery.startsWith('./') || noQuery.startsWith('../') || noQuery === '.' || noQuery === '..') {
        const base = posix.normalize(posix.join(posix.dirname(importerPath), noQuery));
        target =
          probeWithExts(base) ??
          (ASSET_RE.test(noQuery) && existsSync(posix.join(opts.rootDir, base))
            ? { kind: 'asset', path: base }
            : { kind: 'unresolved', reason: 'module-not-found', specifier });
      } else if (noQuery.startsWith('/')) {
        // Absolute-from-repo-root (Vite style) — not used today, cheap to support.
        const base = posix.normalize(noQuery.slice(1));
        target = probeWithExts(base) ?? { kind: 'unresolved', reason: 'module-not-found', specifier };
      } else if (noQuery.startsWith('#')) {
        target = { kind: 'unresolved', reason: 'module-not-found', specifier };
      } else {
        // Bare specifier → package. node_modules is not walked deeply: package
        // imports become `ext:<pkg>`; subpaths with a non-code extension are
        // assets if they exist on disk.
        const segs = noQuery.split('/');
        const pkg = noQuery.startsWith('@') ? segs.slice(0, 2).join('/') : segs[0];
        const subpath = noQuery.slice(pkg.length).replace(/^\/+/, '');
        if (subpath && ASSET_RE.test(subpath)) {
          const abs = posix.join(opts.rootDir, 'node_modules', noQuery);
          target = existsSync(abs) ? { kind: 'asset', path: abs } : { kind: 'unresolved', reason: 'module-not-found', specifier };
        } else {
          target = { kind: 'ext', pkg };
        }
      }
    }

    memo.set(memoKey, target);
    return target;
  }

  return { resolve };
}
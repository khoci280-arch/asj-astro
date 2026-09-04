/**
 * astroGlob.test.ts — Astro.glob expansion (row-8 remainder): pattern
 * matching against the indexed inventory (pure matcher) and the full
 * parse → graph pipeline on a fixture tree.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EdgeType } from '../../docs/code-index-schema.js';
import { buildIndex } from './build.js';
import { matchAstroGlobFiles } from './astroGlob.js';
import { fileIdx } from './util.js';

const TREE = [
  'src/components/Footer.astro',
  'src/components/BottomNav.astro',
  'src/components/ui/Button.astro',
  'src/pages/index.astro',
  'src/pages/blog/[slug].astro',
  'src/lib/data.ts',
  'src/lib/util.ts',
].map((path, i) => ({ path, idx: fileIdx(i) }));

/** Files `pattern` matches when written from src/pages/index.astro, as paths. */
const matches = (pattern: string): string[] =>
  matchAstroGlobFiles(pattern, 'src/pages/index.astro', TREE).map((idx) => TREE.find((f) => f.idx === idx)!.path);

describe('matchAstroGlobFiles (fast-glob subset over the inventory)', () => {
  it('* stays within one path segment', () => {
    expect(matches('../components/*.astro')).toEqual(['src/components/Footer.astro', 'src/components/BottomNav.astro']);
    expect(matches('../nope/*.astro')).toEqual([]);
  });

  it('** crosses zero or more directory segments', () => {
    expect(matches('../components/**/*.astro')).toEqual([
      'src/components/Footer.astro',
      'src/components/BottomNav.astro',
      'src/components/ui/Button.astro',
    ]);
  });

  it('{a,b} alternation and literal dots stay literal', () => {
    expect(matches('../components/{Footer,BottomNav}.astro')).toEqual(['src/components/Footer.astro', 'src/components/BottomNav.astro']);
    expect(matches('../lib/*.{ts,js}')).toEqual(['src/lib/data.ts', 'src/lib/util.ts']);
    expect(matches('../components/FooterX.astro')).toEqual([]); // '.' never wildcards
  });

  it('? and [...] match within a segment', () => {
    expect(matches('../components/?.astro')).toEqual([]); // names are longer than one char
    expect(matches('../components/[FB]*.astro')).toEqual(['src/components/Footer.astro', 'src/components/BottomNav.astro']);
  });

  it('relative patterns resolve from the importer directory; / patterns from the repo root', () => {
    // '*' stays within one segment: blog/[slug].astro is nested one level deep.
    expect(matches('./*.astro')).toEqual(['src/pages/index.astro']);
    expect(matches('./**/*.astro')).toEqual(['src/pages/index.astro', 'src/pages/blog/[slug].astro']);
    expect(matches('./blog/*.astro')).toEqual(['src/pages/blog/[slug].astro']);
    // '[slug]' is a literal directory in the file system — glob syntax only
    // applies to the pattern, never to candidate paths.
    expect(matches('/src/components/*.astro')).toEqual(['src/components/Footer.astro', 'src/components/BottomNav.astro']);
  });

  it('matching is case-insensitive (like the resolver file lookup)', () => {
    expect(matches('../components/footer.astro')).toEqual(['src/components/Footer.astro']);
  });

  it('empty or whitespace patterns match nothing', () => {
    expect(matches('')).toEqual([]);
    expect(matches('   ')).toEqual([]);
  });
});

describe('Astro.glob expansion — full pipeline (fixture)', () => {
  const PAGE = `---
const cards = await Astro.glob('../components/*.astro');
const gone = await Astro.glob('./missing/*.astro');
---
<div>{cards.length}</div>`;

  it('frontmatter glob calls become AstroGlob module edges; no-match becomes an unresolved record', () => {
    const fx = mkdtempSync(join(tmpdir(), 'idx-astro-glob-'));
    writeFileSync(join(fx, '.gitignore'), 'node_modules/\n', 'utf8');
    mkdirSync(join(fx, 'src', 'pages'), { recursive: true });
    mkdirSync(join(fx, 'src', 'components'), { recursive: true });
    writeFileSync(join(fx, 'src', 'pages', 'page.astro'), PAGE, 'utf8');
    writeFileSync(join(fx, 'src', 'components', 'One.astro'), '---\n---\n<div>1</div>\n', 'utf8');
    writeFileSync(join(fx, 'src', 'components', 'Two.astro'), '---\n---\n<div>2</div>\n', 'utf8');
    const mk = () => buildIndex(fx);
    const r = mk();
    const idxOf = (rel: string) => r.files.find((f) => f.path === rel)!.idx;
    const page = idxOf('src/pages/page.astro');
    const globEdges = r.graph.edges.filter((e) => e.type === EdgeType.AstroGlob && typeof e.to === 'number');
    // One module edge per matched file; the raw pattern stays the specifier.
    expect(
      globEdges.map((e) => ({ from: e.from, to: e.to, specifier: e.specifier })),
    ).toEqual([
      { from: page, to: idxOf('src/components/One.astro'), specifier: '../components/*.astro' },
      { from: page, to: idxOf('src/components/Two.astro'), specifier: '../components/*.astro' },
    ]);
    // A glob imports whole modules, never names: no bindings, and the
    // reverse-dependency sets include the glob's targets.
    expect(globEdges.every((e) => Array.isArray(e.bindings) && e.bindings.length === 0)).toBe(true);
    expect(r.graph.revDeps.get(idxOf('src/components/One.astro'))?.has(page)).toBe(true);
    // A pattern matching no indexed file is a health signal, not a silent no-op.
    expect(r.graph.unresolved).toContainEqual({ from: page, specifier: './missing/*.astro', reason: 'astro-glob-no-match' });
    // Deterministic across builds (same edge set).
    const b = mk();
    const sig = (x: typeof r): string =>
      x.graph.edges
        .filter((e) => e.type === EdgeType.AstroGlob && typeof e.to === 'number')
        .map((e) => `${e.from}:${e.to}:${e.specifier}`)
        .sort()
        .join('\n');
    expect(sig(b)).toBe(sig(r));
  }, 120000);
});

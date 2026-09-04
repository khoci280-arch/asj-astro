/**
 * build.test.ts — full pipeline (Phases 0-4) over the real repo.
 */

import { describe, expect, it } from 'vitest';
import { buildIndex, type BuildResult } from './build.js';

const ROOT = process.cwd().replace(/\\/g, '/');

let cached: BuildResult | null = null;
function built(): BuildResult {
  return (cached ??= buildIndex(ROOT));
}

describe('full build', () => {
  it('indexes the measured inventory', () => {
    const r = built();
    expect(r.stats.fileCount).toBe(247); // 144 ts + 46 tsx + 12 astro + 12 mjs + 4 cjs + 29 js
    expect(r.stats.fileCount).toBe(r.files.length);
  });

  it('produces a symbol population in the Phase-4 envelope (9k+)', () => {
    // Phase 4's parse upgrades (destructured params, catch params, for-loop
    // declarations, import bindings) pushed the population to ~9.3k.
    const r = built();
    expect(r.stats.symbolCount).toBeGreaterThanOrEqual(8500);
    expect(r.stats.symbolCount).toBeLessThanOrEqual(10500);
    expect(r.stats.symbolCount).toBe(r.symbols.length);
  });

  it('reports occurrences, unresolved, and stage timings', () => {
    const r = built();
    expect(r.stats.referenceCount).toBeGreaterThan(20000); // bound references
    // Unresolved bucket (Phase 4): lib globals are tagged lib-not-loaded and
    // the lib tier graduates the whole bucket to libRefs — the residual is
    // exactly zero (CJS module-wrapper vars + the Astro global graduate via
    // canonical framework entries); global-unknowns are zero (the five genuine
    // dangling refs got fixed, §13).
    const lib = r.unresolvedRefs.filter((u) => u.reason === 'lib-not-loaded').length;
    const genuine = r.unresolvedRefs.filter((u) => u.reason === 'global-unknown').length;
    expect(lib).toBe(0);
    expect(r.libRefs.length).toBeGreaterThan(1000);
    expect(r.stats.libRefCount).toBe(r.libRefs.length);
    expect(genuine).toBe(0);
    // unresolvedCount additionally includes the 2 import-level unresolveds
    // (the https dynamic imports in fcm.ts) from the resolve stage.
    expect(r.stats.unresolvedCount).toBe(r.unresolvedRefs.length + 2);
    expect(r.stats.stageMs.discover).toBeGreaterThan(0);
    expect(r.stats.stageMs.parse).toBeGreaterThan(0);
    expect(r.stats.stageMs.resolve).toBeGreaterThan(0);
  });

  it('respects the full-build budget (< 3 s standalone, vitest JIT overhead accounted)', () => {
    // Standalone `idx build` measures ~1 s (measured 2026-09-03); under vitest the
    // same stages take ~3.5 s because the TS sources run through vite's transform.
    const s = built().stats.stageMs;
    expect(s.discover + s.parse + s.resolve).toBeLessThan(5000);
  });

  it('is deterministic across builds', () => {
    const a = built();
    const b = buildIndex(ROOT);
    expect(b.files.map((f) => f.path)).toEqual(a.files.map((f) => f.path));
    expect(b.symbols.map((s) => s.id)).toEqual(a.symbols.map((s) => s.id));
    expect(b.stats.symbolCount).toBe(a.stats.symbolCount);
    expect(b.stats.referenceCount).toBe(a.stats.referenceCount);
  });

  it('every file node carries the three hashes and a line index', () => {
    for (const f of built().files) {
      expect(f.hash).toMatch(/^[0-9a-f]{32}$/);
      expect(f.declHash).toMatch(/^[0-9a-f]{32}$/);
      expect(f.exportHash).toMatch(/^[0-9a-f]{32}$/);
      expect(f.lineIndex.length).toBeGreaterThan(0);
    }
  });

  it('poisoned files retain their inventory record', () => {
    const r = built();
    for (const f of r.files) {
      if (f.poisoned) {
        expect(f.poisoned.error).toBeTruthy();
      }
    }
  });
  it('astro template tags resolve through frontmatter imports into Renders module edges (row 8)', () => {
    const r = built();
    const renders = r.graph.edges.filter((e) => e.type === 13 && typeof e.to === 'number');
    expect(renders.length).toBeGreaterThan(0); // 12 astro files render imported components
    const fileIdx = (rel: string): number => r.files.find((f) => f.path === rel)?.idx ?? -1;
    const layout = fileIdx('src/layouts/BaseLayout.astro');
    const footer = fileIdx('src/components/Footer.astro');
    expect(layout).toBeGreaterThanOrEqual(0);
    const layoutRenders = renders.filter((e) => e.from === layout);
    // BaseLayout renders BottomNav/Footer/Toast — each a distinct target file.
    expect(layoutRenders.some((e) => e.to === footer)).toBe(true);
    // specifier carries the tag: <Footer> resolves to the Footer.astro module.
    expect(layoutRenders.some((e) => e.specifier === '<Footer>')).toBe(true);
    // Every real astro template tag is bound by a frontmatter import: no
    // template-component unresolveds on this tree (a tag without an import
    // would be an Astro compile error).
    expect(r.graph.unresolved.filter((u) => u.reason === 'template-component')).toHaveLength(0);
    // deterministic: same render set across builds
    const again = buildIndex(ROOT);
    const renders2 = again.graph.edges.filter((e) => e.type === 13 && typeof e.to === 'number');
    expect(renders2.length).toBe(renders.length);
  });

});

/**
 * deep-tier.test.ts — the checker-backed member tier (§9.1, row-9 remainder).
 * buildIndex defaults the tier ON (deep): light-unbound Property occurrences
 * the compiler resolves to an indexed declaration join r.refs with
 * resolvedVia 'type' + deep: true. Pins: real-tree deep refs exist and join
 * honestly (symbol exists, name matches the member, no offset collision with
 * light refs), deterministic across builds, dump round-trip keeps the deep
 * flag; degradation: a tsconfig-less root yields zero deep refs without
 * throwing; watch's opt-out ({ deep: false }) yields none.
 */

import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex } from './build.js';
import { dumpDoc, loadSnapshot } from './dump.js';
import { OccurrenceRole, type Occurrence } from '../../docs/code-index-schema.js';

const ROOT = process.cwd().replace(/\\/g, '/');

function occByName(occurrences: Occurrence[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const o of occurrences) if (o.role === OccurrenceRole.Property) m.set(`${o.fileIdx}:${o.range.start}`, o.name);
  return m;
}

describe('deep tier (checker-backed member bind)', () => {
  it('real tree: deep refs exist, join indexed symbols with matching names, and never collide with light refs', () => {
    const r = buildIndex(ROOT);
    const light = r.refs.filter((z) => !z.deep);
    const deep = r.refs.filter((z) => z.deep);
    expect(deep.length).toBeGreaterThan(50); // sample sized 80 on 25 files; full tree more
    const syms = new Set(r.symbols.map((s) => s.key));
    const occName = occByName(r.occurrences);
    const lightStart = new Set(light.map((z) => `${z.fileIdx}:${z.range.start}`));
    for (const z of deep) {
      expect(syms.has(z.symKey)).toBe(true); // no dangling join
      expect(z.resolvedVia).toBe('type');
      expect(z.role).toBe(OccurrenceRole.Property);
      expect(lightStart.has(`${z.fileIdx}:${z.range.start}`)).toBe(false); // no double-bind
      const sym = r.symbols.find((s) => s.key === z.symKey)!;
      const member = occName.get(`${z.fileIdx}:${z.range.start}`);
      expect(member).toBeDefined();
      expect(sym.name).toBe(member); // never a guess: name must match
    }
    // Lib tier: thousands of checker-confirmed lib refs, the value bucket
    // reduced to framework globals, Property rows carrying the member name.
    expect(r.libRefs.length).toBeGreaterThan(1000);
    expect(r.stats.libRefCount).toBe(r.libRefs.length);
    for (const z of r.libRefs) {
      expect(z.libId.length).toBeGreaterThan(0);
      expect(z.libName.length).toBeGreaterThan(0);
      const m = occName.get(`${z.fileIdx}:${z.range.start}`);
      if (m !== undefined) expect(m).toBe(z.name); // member rows match the site
    }
    expect(r.unresolvedRefs.filter((u) => u.reason === 'lib-not-loaded').length).toBeLessThan(50); // CJS + framework intrinsics
    expect(r.stats.stageMs.deep).toBeGreaterThan(0);
  }, 120000);

  it('deterministic: two builds emit the same deep refs and lib refs', () => {
    const a = buildIndex(ROOT);
    const b = buildIndex(ROOT);
    const keysA = a.refs.filter((z) => z.deep).map((z) => `${z.fileIdx}:${z.range.start}:${z.symKey}`);
    const keysB = b.refs.filter((z) => z.deep).map((z) => `${z.fileIdx}:${z.range.start}:${z.symKey}`);
    expect(keysA).toEqual(keysB);
    const libA = a.libRefs.map((z) => `${z.fileIdx}:${z.range.start}:${z.libId}:${z.libName}`);
    const libB = b.libRefs.map((z) => `${z.fileIdx}:${z.range.start}:${z.libId}:${z.libName}`);
    expect(libA).toEqual(libB);
  }, 120000);

  it('dump round-trip keeps the deep flag and lib refs (additive contract)', () => {
    const r = buildIndex(ROOT);
    const doc = dumpDoc(r);
    expect(doc.refs.some((z) => z.deep === true)).toBe(true);
    expect(doc.libRefs.length).toBe(r.libRefs.length);
    expect(doc.stats.libRefCount).toBe(r.libRefs.length);
    const libIdx = new Set(doc.libs.map((l) => l.idx));
    for (const z of doc.libRefs) expect(libIdx.has(z.libIdx)).toBe(true); // no dangling lib join
    const path = join(tmpdir(), `idx-deep-${process.pid}-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify(doc), 'utf8');
    const loaded = loadSnapshot(path);
    expect(loaded.refs.filter((z) => z.deep === true).length).toBe(doc.refs.filter((z) => z.deep === true).length);
    expect(loaded.libRefs.length).toBe(doc.libRefs.length);
  }, 120000);

  it('lib tier binds lib globals and members on a tsconfig fixture (never a guess)', () => {
    const fx = mkdtempSync(join(tmpdir(), 'idx-lib-fx-'));
    writeFileSync(join(fx, '.gitignore'), 'node_modules/\n', 'utf8');
    writeFileSync(
      join(fx, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', lib: ['ES2022', 'DOM'], strict: true, skipLibCheck: true, types: [] } }),
      'utf8',
    );
    mkdirSync(join(fx, 'src'), { recursive: true });
    writeFileSync(
      join(fx, 'src', 'a.ts'),
      ['const s: string = String(1);', 'const p: unknown = JSON.parse("{}");', 'console.log(s);', 'document.createElement("div");', 'export const x = p;'].join('\n'),
      'utf8',
    );
    const r = buildIndex(fx);
    const names = r.libRefs.map((z) => `${z.name}@${z.libName}`).sort();
    expect(names).toContain('String@String'); // value bucket graduated
    expect(names).toContain('JSON@JSON');
    expect(names).toContain('console@console');
    expect(names.some((n) => n === 'log@Console.log')).toBe(true); // member bind
    expect(names.some((n) => n === 'createElement@Document.createElement')).toBe(true);
    expect(r.unresolvedRefs.filter((u) => u.reason === 'lib-not-loaded')).toHaveLength(0);
  }, 120000);

  it('degrades to zero deep refs on a tsconfig-less root (watch opt-out too)', () => {
    const fx = mkdtempSync(join(tmpdir(), 'idx-deep-fx-'));
    writeFileSync(join(fx, '.gitignore'), 'node_modules/\n', 'utf8');
    mkdirSync(join(fx, 'src'), { recursive: true });
    writeFileSync(join(fx, 'src', 'a.ts'), 'export class A { b(): number { return 1; } }\nexport const a = new A();\na.b();\n', 'utf8');
    const mk = (d: boolean) => buildIndex(fx, { deep: d });
    const off = mk(false);
    expect(off.refs.filter((z) => z.deep).length).toBe(0);
    expect(off.stats.stageMs.deep).toBeLessThan(50); // fast no-op (timer still runs)
    const degraded = mk(true); // no tsconfig.json → program fails → tier degrades
    expect(degraded.refs.filter((z) => z.deep).length).toBe(0);
    expect(degraded.refs.length).toBe(off.refs.length);
  });
});

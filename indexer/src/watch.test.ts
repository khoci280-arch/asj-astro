/**
 * watch.test.ts — Phase 6 generation diffs over synthetic two-generation
 * documents: file drift by hash, count deltas, no-op detection, and bounded
 * history bookkeeping. Real fs.watch/poll behavior is exercised by
 * indexer/src/watch.e2e.ts (kept out of the default vitest run).
 */

import { describe, expect, it } from 'vitest';
import type { DumpDoc } from './dump.js';
import { commitGenerationLine, diffDocs, docCounts, isNoopDiff, pushHistory, type GenerationDiff } from './watch.js';

function mk(
  epoch: number,
  files: Array<[string, string]>,
  counts: { symbols?: number; refs?: number; edges?: number; imports?: number; unresolved?: number; unresolvedImports?: number } = {},
): DumpDoc {
  const arr = (n: number): unknown[] => Array.from({ length: n }, () => ({}));
  return {
    epoch,
    rootDir: '/r',
    files: files.map(([path, hash], i) => ({ idx: i, path, hash })),
    symbols: arr(counts.symbols ?? 0),
    refs: arr(counts.refs ?? 0),
    symbolEdges: arr(counts.edges ?? 0),
    importEdges: arr(counts.imports ?? 0),
    unresolved: arr(counts.unresolved ?? 0),
    unresolvedImports: arr(counts.unresolvedImports ?? 0),
  } as unknown as DumpDoc;
}

const H = (s: string): string => s.padEnd(32, '0');

describe('generation diffs', () => {
  it('a first generation adds every file and reports full count deltas', () => {
    const g1 = mk(1, [['b.ts', H('b')], ['a.ts', H('a')]], { symbols: 4, refs: 7, edges: 2, unresolved: 1 });
    const d = diffDocs(null, g1);
    expect(d.added).toEqual(['a.ts', 'b.ts']); // sorted
    expect(d.changed).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.fileCount).toBe(2);
    expect(d.fileDelta).toBe(2);
    expect(d.symbolDelta).toBe(4);
    expect(d.referenceDelta).toBe(7);
    expect(d.edgeDelta).toBe(2);
    expect(d.importEdgeDelta).toBe(0);
    expect(d.unresolvedDelta).toBe(1);
    expect(isNoopDiff(d)).toBe(false);
  });

  it('classifies add / change (by hash) / remove across generations', () => {
    const g1 = mk(1, [['a.ts', H('a1')], ['b.ts', H('b')], ['c.ts', H('c')]], { symbols: 10 });
    const g2 = mk(2, [['a.ts', H('a2')], ['b.ts', H('b')], ['d.ts', H('d')]], { symbols: 13, refs: 5 });
    const d = diffDocs(g1, g2);
    expect(d.added).toEqual(['d.ts']);
    expect(d.changed).toEqual(['a.ts']);
    expect(d.removed).toEqual(['c.ts']);
    expect(d.fileDelta).toBe(0);
    expect(d.symbolDelta).toBe(3);
    expect(d.referenceDelta).toBe(5);
  });

  it('counts reconcile unresolved refs + unresolved imports', () => {
    const doc = mk(1, [['a.ts', H('a')]], { unresolved: 2, unresolvedImports: 1 });
    expect(docCounts(doc).unresolvedCount).toBe(3);
  });

  it('a no-op generation (same files, same counts) carries no information', () => {
    const g1 = mk(1, [['a.ts', H('a')]], { symbols: 2, refs: 3 });
    const g2 = mk(1, [['a.ts', H('a')]], { symbols: 2, refs: 3 });
    expect(isNoopDiff(diffDocs(g1, g2))).toBe(true);
    // a body-only edit changes the hash but not the counts — still a real gen
    const g3 = mk(1, [['a.ts', H('a2')]], { symbols: 2, refs: 3 });
    expect(isNoopDiff(diffDocs(g1, g3))).toBe(false);
  });

  it('history keeps the newest generations within the bound', () => {
    const history: GenerationDiff[] = [];
    for (let gen = 1; gen <= 5; gen++) {
      pushHistory(history, { gen, trigger: 'watch', ms: 1, ...diffDocs(null, mk(gen, [['a.ts', H('a')]])) }, 3);
    }
    expect(history.map((e) => e.gen)).toEqual([3, 4, 5]);
  });

  it('diffDocs surfaces poisoned files per generation', () => {
    const g1 = mk(1, [['a.ts', H('a')]], { symbols: 2 });
    const g2 = mk(2, [['a.ts', H('a2')]], { symbols: 2 });
    (g2.files as unknown as Array<Record<string, unknown>>)[0] = { idx: 0, path: 'a.ts', hash: H('a2'), poisoned: { error: 'parse error at 1:4' } };
    expect(diffDocs(g1, g2).poisoned).toEqual([{ path: 'a.ts', error: 'parse error at 1:4' }]);
    // a healthy generation carries an empty poisoned list, never undefined
    expect(diffDocs(g1, mk(2, [['a.ts', H('a2')]], { symbols: 2 })).poisoned).toEqual([]);
  });

  it('commitGenerationLine is the single writer policy: epoch = prev+1, no-op returns null', () => {
    const g1 = mk(1, [['a.ts', H('a')]], { symbols: 2 });
    const g2 = mk(2, [['a.ts', H('a2')]], { symbols: 3 });
    const line = commitGenerationLine(g1, g2, 'watch', 7);
    expect(line).not.toBeNull();
    expect(line!.gen).toBe(2); // prev.epoch + 1
    expect(line!.trigger).toBe('watch');
    expect(line!.ms).toBe(7);
    expect(line!.changed).toEqual(['a.ts']);
    expect(g2.epoch).toBe(2); // the commit stamps the doc
    const noop = mk(1, [['a.ts', H('a')]], { symbols: 2 });
    expect(commitGenerationLine(g1, noop, 'watch', 5)).toBeNull();
    expect(noop.epoch).toBe(1); // untouched — no generation, no stamp
  });
});

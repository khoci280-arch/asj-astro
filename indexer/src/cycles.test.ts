/**
 * cycles.test.ts — unit coverage for the SCC/circularity owner (cycles.ts).
 * Semantics mirror dependency-cruiser@18 circularity (verified on the real
 * tree): an edge is circular iff its target reaches its source (non-trivial
 * SCC or self-import); cycle paths are real and deterministic.
 */

import { describe, expect, it } from 'vitest';
import { computeCycles, type CycleEdge } from './cycles.js';

function cyc(edges: Array<[number, number]>): ReturnType<typeof computeCycles> {
  return computeCycles(
    edges.map(([from, to]): CycleEdge => ({ from, to })),
    Math.max(0, ...edges.flat()) + 1,
  );
}

describe('computeCycles', () => {
  it('flags both edges of a two-node cycle and reconstructs both paths', () => {
    const c = cyc([[0, 1], [1, 0]]);
    expect(c.isCircular(0, 1)).toBe(true);
    expect(c.isCircular(1, 0)).toBe(true);
    expect(c.isCircular(0, 0)).toBe(false);
    expect(c.path(0, 1)).toEqual([1, 0]); // to=1 → … → from=0
    expect(c.path(1, 0)).toEqual([0, 1]);
    expect(c.cycles()).toHaveLength(1);
    expect(c.cycles()[0].members).toEqual([0, 1]);
  });

  it('flags every edge of a three-node cycle as circular but reports one SCC', () => {
    const c = cyc([[0, 1], [1, 2], [2, 0]]);
    for (const [f, t] of [[0, 1], [1, 2], [2, 0]]) expect(c.isCircular(f, t)).toBe(true);
    expect(c.cycles()).toHaveLength(1);
    expect(c.cycles()[0].members).toEqual([0, 1, 2]);
    expect(c.path(0, 2)).toEqual([2, 0]);
  });

  it('leaves acyclic chains and diamonds circular-free', () => {
    const c = cyc([[0, 1], [1, 2], [0, 3], [3, 2]]);
    expect(c.cycles()).toHaveLength(0);
    for (let f = 0; f < 4; f++) for (let t = 0; t < 4; t++) expect(c.isCircular(f, t)).toBe(false);
    expect(c.path(2, 0)).toEqual([]);
  });

  it('treats a self-import as circular and nothing else in the same file', () => {
    const c = cyc([[0, 0]]);
    expect(c.isCircular(0, 0)).toBe(true);
    expect(c.cycles()).toHaveLength(0); // singleton SCCs are not reported as cycles
    expect(c.path(0, 0)).toEqual([0]);
    const noSelf = cyc([[0, 1]]);
    expect(noSelf.isCircular(0, 0)).toBe(false);
  });

  it('keeps disjoint cycles separate and paths deterministic', () => {
    const c = cyc([[0, 1], [1, 0], [2, 3], [3, 4], [4, 2]]);
    const sccs = c.cycles();
    expect(sccs).toHaveLength(2);
    expect(new Set(sccs.map((s) => s.members.join(',')))).toEqual(new Set(['0,1', '2,3,4']));
    // Deterministic across recomputation.
    const again = cyc([[0, 1], [1, 0], [2, 3], [3, 4], [4, 2]]);
    expect(again.cycles().map((s) => s.members.join(','))).toEqual(sccs.map((s) => s.members.join(',')));
    expect(c.path(2, 4)).toEqual([4, 2]);
  });

  it('computes paths only inside the cycle (to can reach from)', () => {
    // a→b→c→a and a→d (d outside the SCC): the a→d edge is not circular.
    const c = cyc([[0, 1], [1, 2], [2, 0], [0, 3]]);
    expect(c.isCircular(0, 3)).toBe(false);
    expect(c.isCircular(0, 1)).toBe(true);
    expect(c.isCircular(1, 2)).toBe(true);
    expect(c.isCircular(2, 0)).toBe(true);
    expect(c.path(0, 1)).toEqual([1, 2, 0]);
  });
});
/**
 * cycles.ts — roadmap row 8 (circularity half): strongly-connected-component
 * detection over the module graph, the single owner of cycle answers in the
 * query layer.
 *
 * Semantics mirror dependency-cruiser's circularity (verified against
 * dependency-cruiser@18 on the real tree, 2026-09-03):
 *  - an edge from→to is `circular` iff `to` can reach `from` — i.e. both sit
 *    in one non-trivial SCC (size >= 2), or the file imports itself;
 *  - cycle violations are deduped per SCC member set, not per edge (two edges
 *    of the same cycle report once);
 *  - the displayed cycle is a real path `to → … → from`, neighbors walked in
 *    file order so output is deterministic.
 *
 * Pure over the edge list: no fs, no dump knowledge — callers map fileIdx to
 * paths. The algorithm is iterative Kosaraju (explicit stacks; no recursion
 * depth risk on large graphs).
 */

export interface CycleEdge {
  from: number;
  to: number;
}

export interface CycleInfo {
  /** SCC id per fileIdx (-1 when the file has no edges at all). */
  compOf: Int32Array;
  /** Member count per SCC id. */
  compSize: Int32Array;
  /** Number of SCCs (singletons included). */
  compCount: number;
  /** True when `to` can reach `from` (same non-trivial SCC or a self-loop). */
  isCircular(from: number, to: number): boolean;
  /**
   * A real cycle path `to → … → from` of file idxs, empty when none exists.
   * Deterministic: walks in ascending neighbor order.
   */
  path(from: number, to: number): number[];
  /** Every non-trivial SCC (size >= 2) with its member idxs, sorted. */
  cycles(): Array<{ id: number; members: number[] }>;
}

export function computeCycles(edges: ReadonlyArray<CycleEdge>, fileCount: number): CycleInfo {
  const adj = new Map<number, number[]>();
  const radj = new Map<number, number[]>();
  for (const e of edges) {
    let a = adj.get(e.from);
    if (!a) adj.set(e.from, (a = []));
    a.push(e.to);
    let r = radj.get(e.to);
    if (!r) radj.set(e.to, (r = []));
    r.push(e.from);
  }
  for (const list of adj.values()) list.sort((x, y) => x - y);
  for (const list of radj.values()) list.sort((x, y) => x - y);

  const compOf = new Int32Array(fileCount).fill(-1);
  const compSize: number[] = [];
  const order: number[] = [];
  const seen = new Uint8Array(fileCount);

  // Pass 1: finish-order DFS over the forward graph (iterative).
  for (let start = 0; start < fileCount; start++) {
    if (seen[start]) continue;
    const stack: Array<{ v: number; next: number }> = [{ v: start, next: 0 }];
    seen[start] = 1;
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const out = adj.get(top.v) ?? [];
      if (top.next < out.length) {
        const w = out[top.next++];
        if (!seen[w]) {
          seen[w] = 1;
          stack.push({ v: w, next: 0 });
        }
      } else {
        order.push(top.v);
        stack.pop();
      }
    }
  }

  // Pass 2: reverse-graph DFS in reverse finish order assigns SCC ids.
  let compCount = 0;
  for (let i = order.length - 1; i >= 0; i--) {
    const start = order[i];
    if (compOf[start] >= 0) continue;
    const id = compCount++;
    const stack = [start];
    compOf[start] = id;
    let size = 0;
    while (stack.length > 0) {
      const v = stack.pop()!;
      size++;
      for (const w of radj.get(v) ?? []) {
        if (compOf[w] < 0) {
          compOf[w] = id;
          stack.push(w);
        }
      }
    }
    compSize.push(size);
  }

  const compOfN = (v: number): number => (v >= 0 && v < fileCount ? compOf[v] : -1);

  /** One real path `to → … → from` inside the SCC, or [] when unreachable. */
  function path(from: number, to: number): number[] {
    const cid = compOfN(from);
    if (cid < 0 || cid !== compOfN(to)) return [];
    const size = compSize[cid] ?? 0;
    if (from === to) {
      // Self-loop: only when the file actually imports itself.
      return (adj.get(from) ?? []).includes(from) ? [from] : [];
    }
    if (size < 2) return [];
    // Iterative DFS from `to` toward `from`, neighbors in ascending order.
    const prev = new Map<number, number>();
    const visited = new Uint8Array(fileCount);
    visited[to] = 1;
    const stack = [to];
    while (stack.length > 0) {
      const v = stack.pop()!;
      if (v === from) break;
      const out = (adj.get(v) ?? []).filter((w) => compOfN(w) === cid);
      for (let i = out.length - 1; i >= 0; i--) {
        const w = out[i];
        if (!visited[w]) {
          visited[w] = 1;
          prev.set(w, v);
          stack.push(w);
        }
      }
    }
    if (!prev.has(from) && from !== to) return [];
    const outPath: number[] = [];
    let cur: number | undefined = from;
    while (cur !== undefined && cur !== to) {
      outPath.unshift(cur);
      cur = prev.get(cur);
    }
    outPath.unshift(to);
    return outPath;
  }

  return {
    compOf,
    compSize: Int32Array.from(compSize),
    compCount,
    isCircular(from, to) {
      if (from === to) return (adj.get(from) ?? []).includes(from);
      const cid = compOfN(from);
      return cid >= 0 && cid === compOfN(to) && (compSize[cid] ?? 0) >= 2;
    },
    path,
    cycles() {
      const out: Array<{ id: number; members: number[] }> = [];
      for (let id = 0; id < compCount; id++) {
        if ((compSize[id] ?? 0) < 2) continue;
        const members: number[] = [];
        for (let v = 0; v < fileCount; v++) if (compOf[v] === id) members.push(v);
        out.push({ id, members });
      }
      return out;
    },
  };
}
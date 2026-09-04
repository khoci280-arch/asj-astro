/**
 * validate.test.ts — guardrail for the differential-validation harness (§13).
 *
 * Runs the validator in `--sample` mode (fast; the full-inventory run is a
 * manual `node dist/indexer/src/validate.js`) and asserts the Tier-1 binder
 * and the compiler agree on every bindable occurrence in the sample:
 * same name at the same offset when bound, genuinely unresolvable otherwise.
 * Deliberate deviations (lib-not-loaded, non-bindable roles, JSX intrinsics)
 * are counted separately and must not leak into the disagreement buckets.
 */

import { describe, expect, it } from 'vitest';
import { runValidation } from './validate.js';

const ROOT = process.cwd().replace(/\\/g, '/');

describe('differential validation (sample)', () => {
  // The sample run builds the full 247-file program + index under vitest's
  // transform; the declaration-identity chains push it past the default 5 s.
  const TIMEOUT = 60_000;

  it('agrees with the compiler on every bindable occurrence', { timeout: TIMEOUT }, () => {
    const r = runValidation(ROOT, { sampleOnly: true });
    // Agreement buckets are non-trivial (the sample is real code)…
    expect(r.counts.agreeBound).toBeGreaterThan(1000);
    expect(r.counts.agreeUnresolved).toBe(0); // the five known dangling refs (§13 Phase 4) are gone
    // …and every disagreement bucket is empty.
    expect(r.counts.disagreeBoundNoCompiler).toBe(0);
    expect(r.counts.disagreeNameMismatch).toBe(0);
    expect(r.counts.disagreeFalsePositive).toBe(0);
    expect(r.counts.offsetMismatch).toBe(0);
    expect(r.disagreements).toHaveLength(0);
  });

  it('graduates lib globals to lib refs; only CJS/framework intrinsics stay unresolved', { timeout: TIMEOUT }, () => {
    const r = runValidation(ROOT, { sampleOnly: true });
    // The lib tier emitted checker-confirmed lib refs for the bucket. Every
    // emitted row must bind the same name at the offset (never a guess), and
    // the residual lib-not-loaded rows are CJS module vars (exports/module,
    // compiler-binds the module object) and the Astro framework global
    // (compiler binds nothing).
    expect(r.counts.libRefs).toBeGreaterThan(400);
    expect(r.counts.libRefAgree).toBe(r.counts.libRefs);
    expect(r.counts.libRefDisagree).toBe(0);
    expect(r.counts.libNotLoaded).toBeGreaterThan(1);
    expect(r.counts.libNotLoaded).toBeLessThan(10);
    expect(r.counts.libCompilerNone).toBe(1); // Astro framework global
  });
});
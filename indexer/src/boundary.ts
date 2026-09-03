/**
 * boundary.ts — roadmap row 8 (violations half): loads and normalizes the
 * repo's own architecture rules — `.dependency-cruiser.cjs` at the rootDir —
 * into the neutral ForbidRule form query.ts evaluates. The config file is the
 * SINGLE source of truth: no rule text is duplicated here, and rules whose
 * semantics the module edge set cannot express are reported as skipped (with
 * the reason), never half-ported. A rule with a `comment` contributes it as
 * the violation's `reason`.
 *
 * Only `forbid` rules of module scope with from/to path + pathNot filters are
 * evaluated over the index's file-to-file import edges; `to.circular` is
 * honored too (evaluated over the module graph's SCCs, cycles.ts — the
 * semantics mirror dependency-cruiser@18, verified on the real tree).
 * dependencyTypes are honored when they name kinds the index expresses
 * (import / type-only / dynamic-import / reexport); anything else
 * (via/viaNot, reachable, `from.circular`, allowed rules, folder/scope
 * granularity) is skipped and recorded — never half-ported.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ForbidRule, ForbidRulePath } from './query.js';

export const CRUISE_CONFIG = '.dependency-cruiser.cjs';

export interface SkippedRule {
  name: string;
  reason: string;
}

export interface LoadedRules {
  /** Config file this was loaded from (rootDir-relative name). */
  config: string;
  rules: ForbidRule[];
  skipped: SkippedRule[];
}

const cache = new Map<string, Promise<LoadedRules>>();

export function cruiseConfigPath(rootDir: string): string {
  return join(rootDir, CRUISE_CONFIG);
}

export function hasCruiseConfig(rootDir: string): boolean {
  return existsSync(cruiseConfigPath(rootDir));
}

/** Load + normalize the rules once per root (the config is stable at runtime). */
export function loadForbidRules(rootDir: string): Promise<LoadedRules> {
  let pending = cache.get(rootDir);
  if (!pending) {
    pending = doLoad(rootDir).catch((err) => {
      cache.delete(rootDir); // a transient failure should not poison the cache
      throw err;
    });
    cache.set(rootDir, pending);
  }
  return pending;
}

async function doLoad(rootDir: string): Promise<LoadedRules> {
  const configPath = cruiseConfigPath(rootDir);
  if (!existsSync(configPath)) {
    throw new Error(`no ${CRUISE_CONFIG} at ${rootDir} — the config is the rules source`);
  }
  let mod: { default?: unknown };
  try {
    mod = (await import(pathToFileURL(configPath).href)) as { default?: unknown };
  } catch (err) {
    throw new Error(`cannot load ${configPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const conf = (mod.default ?? {}) as { forbidden?: unknown[] };
  const rules: ForbidRule[] = [];
  const skipped: SkippedRule[] = [];
  for (const raw of conf.forbidden ?? []) {
    if (typeof raw !== 'object' || raw === null) continue;
    const name = (raw as { name?: unknown }).name;
    if (typeof name !== 'string' || name === '') continue;
    const record = raw as Record<string, unknown>;
    const reason = portedForbid(name, record);
    if (reason === null) rules.push(portedRule(name, record));
    else skipped.push({ name, reason });
  }
  return { config: CRUISE_CONFIG, rules, skipped };
}

/** Portable sides: path/pathNot only. Returns the skip reason, or null when portable. */
function portedForbid(name: string, rule: Record<string, unknown>): string | null {
  if (rule.severity !== undefined && rule.severity !== 'error' && rule.severity !== 'warn') {
    return `severity '${String(rule.severity)}' is not error/warn`;
  }
  for (const key of ['from', 'to']) {
    const side = rule[key];
    if (side !== undefined && (typeof side !== 'object' || side === null)) {
      return `${key} is not an object`;
    }
    if (side !== undefined) {
      // to.circular is expressible (SCC evaluation); anything else on either side is not.
      const allowed = key === 'to' ? ['path', 'pathNot', 'circular'] : ['path', 'pathNot'];
      const extra = Object.keys(side as object).filter((k) => !allowed.includes(k));
      if (extra.length > 0) {
        return `${key}.${extra.join('/')} is not expressible over module import edges`;
      }
      if (key === 'to' && (side as { circular?: unknown }).circular !== undefined && typeof (side as { circular?: unknown }).circular !== 'boolean') {
        return `to.circular must be a boolean`;
      }
    }
  }
  const from = rule.from as { path?: unknown; pathNot?: unknown } | undefined;
  const to = rule.to as { path?: unknown; pathNot?: unknown } | undefined;
  const sideHasFilter = (s: { path?: unknown; pathNot?: unknown } | undefined): boolean =>
    s !== undefined && (s.path !== undefined || s.pathNot !== undefined);
  if (!sideHasFilter(from) && !sideHasFilter(to) && (to as { circular?: unknown } | undefined)?.circular === undefined) {
    return 'matches every module dependency — no path/pathNot filter to evaluate';
  }
  void name;
  return null;
}

function strOrArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  throw new Error('path/pathNot must be a string or an array of strings');
}

function portedRule(name: string, rule: Record<string, unknown>): ForbidRule {
  const side = (raw: unknown): ForbidRulePath => {
    const s = (raw ?? {}) as { path?: unknown; pathNot?: unknown };
    const out: ForbidRulePath = {};
    const path = strOrArray(s.path);
    const pathNot = strOrArray(s.pathNot);
    const circ = (s as { circular?: unknown }).circular;
    if (path) out.path = path;
    if (pathNot) out.pathNot = pathNot;
    if (typeof circ === 'boolean') out.circular = circ;
    return out;
  };
  const r: ForbidRule = {
    name,
    severity: rule.severity === 'warn' ? 'warn' : 'error',
    from: side(rule.from),
    to: side(rule.to),
  };
  const comment = rule.comment;
  if (typeof comment === 'string') r.comment = comment;
  // dependencyTypes that name the four kinds the index can express.
  const dt = rule.dependencyTypes;
  if (Array.isArray(dt) && dt.every((x) => typeof x === 'string')) {
    const expressible = (dt as string[]).filter((x) => ['import', 'type-only', 'dynamic-import', 'reexport', 'local', 'alias'].includes(x));
    if (expressible.length > 0) r.dependencyTypes = expressible;
  }
  return r;
}

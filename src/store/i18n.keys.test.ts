/**
 * i18n.keys.test.ts — Dictionary coverage guard.
 *
 * Fails when a key actually *used* by the UI is missing from the "id" or "jp"
 * dictionary. A missing key is not cosmetic: `t()` then renders the raw key in
 * the id UI, and Japanese users silently fall back to the Indonesian text.
 *
 * Scope of "used":
 *   1. literal `t('key')` / `t("key")` calls,
 *   2. `data-lang="key"` elements (translated via translateDataLang),
 *   3. key-shaped string literals inside src (labels stored in data
 *      structures and later passed to t(), e.g. MasterFullForm labelKey,
 *      berkasCatalog labels, EsignNaiteiModal areas).
 *
 * Known limitation (deliberate): keys assembled at runtime from parts
 * (e.g. t('option.' + x)) cannot be resolved statically — keep those keys in
 * both dictionaries manually. Dictionary files are parsed as source text (not
 * imported) so this test has no runtime dependency on the store.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const I18N_TS = join(ROOT, 'src', 'store', 'i18n.ts');
const I18N_JP_TS = join(ROOT, 'src', 'store', 'i18n-jp.ts');

// Known top-level namespaces — used only for the data-driven literal scan.
const NS = [
  'header', 'ui', 'public', 'button', 'form', 'siswa', 'apply', 'master',
  'ai_cv', 'share', 'admin', 'dash', 'candidate', 'option', 'status',
  'login', 'toast', 'error', 'table', 'landing', 'cvmini', 'esign',
  'changepass', 'doc', 'toolbar', 'bottomnav', 'cv', 'ai', 'input', 'db',
  'pelamar', 'wa', 'footer',
].join('|');

function collectUsed(): Set<string> {
  const used = new Set<string>();
  const tKeyRe = /\bt\(\s*(["'])([^"']+?)\1/g;
  const dataLangRe = /data-lang=["']([^"']+)["']/g;
  const litRe = new RegExp(`["']((?:${NS})\\.[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*)["']`, 'g');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
    return out;
  };

  for (const file of walk(join(ROOT, 'src'))) {
    // Only source code carries t()/data-lang/label usage — scanning assets
    // (sprite.svg, css, ...) pulls in bare words like "admin" as false hits.
    if (!/\.(tsx?|astro)$/.test(file)) continue;
    const name = relative(ROOT, file);
    if (name.includes('test')) continue; // skip test files (they often mock t)
    if (file === I18N_TS || file === I18N_JP_TS) continue;
    const text = readFileSync(file, 'utf-8');
    for (const m of text.matchAll(tKeyRe)) used.add(m[2]);
    for (const m of text.matchAll(dataLangRe)) used.add(m[1]);
    for (const m of text.matchAll(litRe)) used.add(m[1]);
  }
  return used;
}

function parseKeys(text: string, startMarker: string, endMarker?: string): string[] {
  const body = endMarker
    ? text.slice(text.indexOf(startMarker), text.indexOf(endMarker))
    : text;
  const keys: string[] = [];
  for (const line of body.split('\n')) {
    // Definition lines look like:   "some.key": "...",
    const m = /^\s*"([^"]+)":\s*"/.exec(line);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function countDuplicates(keys: string[]): string[] {
  const seen = new Map<string, number>();
  for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

describe('i18n dictionary coverage', () => {
  const used = collectUsed();
  const idKeys = parseKeys(readFileSync(I18N_TS, 'utf-8'), 'id: {', 'jp: {}');
  const jpKeys = parseKeys(readFileSync(I18N_JP_TS, 'utf-8'), '{');

  it('scans a meaningful number of source keys (sanity: walk found sources)', () => {
    expect(used.size).toBeGreaterThan(400);
  });

  it('contains no duplicate keys', () => {
    expect(countDuplicates(idKeys)).toEqual([]);
    expect(countDuplicates(jpKeys)).toEqual([]);
  });

  it('has every used key in the "id" dictionary', () => {
    const present = new Set(idKeys);
    const missing = [...used].filter((k) => !present.has(k)).sort();
    expect(missing, [
      'Keys used via t()/data-lang/labels are missing from the "id" dictionary.',
      'They render as raw text (e.g. "apply.nama_label"). Add them to src/store/i18n.ts.',
      '',
      ...missing.map((k) => `  - ${k}`),
    ].join('\n')).toEqual([]);
  });

  it('has every used key in the "jp" dictionary', () => {
    const present = new Set(jpKeys);
    const missing = [...used].filter((k) => !present.has(k)).sort();
    expect(missing, [
      'Keys used via t()/data-lang/labels are missing from the "jp" dictionary.',
      'Japanese users would silently see the Indonesian fallback. Add them to src/store/i18n-jp.ts.',
      '',
      ...missing.map((k) => `  - ${k}`),
    ].join('\n')).toEqual([]);
  });
});

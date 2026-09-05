// ==========================================
// TESTS: i18n lazy JP dict (P9b race fix)
//
// Root bug: the JP dictionary is installed asynchronously (import('./i18n-jp'))
// while langStore.set('jp') renders synchronously — so the first JP switch
// rendered Indonesian fallbacks and stayed stuck until an unrelated re-render.
// Fix: loadJp() installs translations.jp, ensureJpLoaded() awaits it before a
// JP switch, and jpReady notifies subscribers once the dict is in.
// ==========================================
import { describe, expect, it, vi } from 'vitest';
import { translations, ensureJpLoaded } from './i18n';

describe('i18n lazy JP dict (P9b)', () => {
  it('ensureJpLoaded installs the JP dict before resolving', async () => {
    await ensureJpLoaded();
    expect(Object.keys(translations.jp).length).toBeGreaterThan(0);
    expect(translations.jp['public.all']).toBeTruthy();
  });

  it('a page loaded with lang=jp preloads the dict and notifies jpReady', async () => {
    vi.resetModules();
    localStorage.setItem('asj_lang', JSON.stringify('jp'));
    const fresh = await import('./i18n');
    await vi.waitFor(() => {
      expect(Object.keys(fresh.translations.jp).length).toBeGreaterThan(0);
    });
    expect(fresh.translations.jp['public.all']).toBeTruthy();
    expect(fresh.jpReady.get()).toBe(true);
    // Restore a deterministic lang for any later test in this file.
    localStorage.setItem('asj_lang', JSON.stringify('id'));
    fresh.langStore.set('id');
  });
});

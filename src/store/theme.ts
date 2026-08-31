/**
 * theme.ts — Single source of truth for dark/light theme (Nanostores)
 *
 * WHY THIS EXISTS
 * ---------------
 * There were three independent `toggleTheme()` implementations
 * (App.tsx, public/LokerTable.tsx, forms/FormToolbar.tsx), each holding
 * its own `isDark` useState. Toggling from one left the others stale —
 * the header banner and the moon/sun icon would disagree with the page
 * you actually toggled from.
 *
 * This module owns the theme. Components read `themeStore` and call
 * `toggleTheme()`; nobody keeps local state.
 *
 * MIGRATION NOTE (dual-write)
 * ---------------------------
 * We write BOTH `data-theme` (new token system, see styles/theme.css)
 * and the legacy `.light` class (the ~92 `html.light ... !important`
 * rules in global.css still rely on it). Both stay in sync until the
 * shim is fully deleted, at which point the `.light` write can be
 * dropped — see the plan's Step 9.
 */
import { persistentAtom } from '@nanostores/persistent';

export type ThemeMode = 'dark' | 'light';
export type BannerTheme = 'SAKURA' | 'TOKYO' | 'INTER_VIP';

/** Legacy key used by BaseLayout.astro's restore script — keep in sync. */
const STORAGE_KEY = 'asjTheme';
const BANNER_KEY = 'asj_theme';

export const themeStore = persistentAtom<ThemeMode>(STORAGE_KEY, 'dark', {
  encode: (v) => v,
  decode: (v) => (v === 'light' ? 'light' : 'dark'),
});

/** Banner artwork follows the mode: light → SAKURA, dark → TOKYO. */
export const bannerStore = persistentAtom<BannerTheme>(BANNER_KEY, 'TOKYO', {
  encode: (v) => v,
  decode: (v): BannerTheme =>
    v === 'SAKURA' || v === 'INTER_VIP' ? v : 'TOKYO',
});

/**
 * Apply the theme to the DOM. Call this on load and on every change.
 * Exported so the inline restore script can be mirrored from TS.
 */
export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.add('light'); // legacy shim
  } else {
    root.setAttribute('data-theme', 'dark');
    root.classList.remove('light'); // legacy shim
  }
}

/** Flip the theme. This is the ONLY place that should mutate it. */
export function toggleTheme() {
  const next: ThemeMode = themeStore.get() === 'light' ? 'dark' : 'light';
  setTheme(next);
}

export function setTheme(mode: ThemeMode) {
  themeStore.set(mode);
}

export function setBanner(theme: BannerTheme) {
  bannerStore.set(theme);
}

/** Initialise from persisted state. Safe to call more than once. */
export function initTheme() {
  applyTheme(themeStore.get());
}

if (typeof window !== 'undefined') {
  // React to store changes from any component.
  themeStore.subscribe((mode) => {
    applyTheme(mode);
    // Banner artwork tracks the mode unless the user picked one explicitly.
    bannerStore.set(mode === 'light' ? 'SAKURA' : 'TOKYO');
    window.dispatchEvent(new Event('asj-theme-change'));
  });

  // Cross-tab sync: persistentAtom writes localStorage, mirror the DOM.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) applyTheme(themeStore.get());
  });

  initTheme();
}

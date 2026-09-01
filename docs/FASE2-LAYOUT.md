# FASE 2: Migrasi Layout Statis — DEEP Analysis

## Status: ✅ COMPLETE

## Components Created

| Component | Source | Lines | Purpose |
|-----------|--------|-------|---------|
| `Header.astro` | ~~`legacy/partials/header.html`~~ (migrated) | 95 | Logo, nav modes (admin/kandidat/public), hamburger |
| `Footer.astro` | ~~`legacy/partials/footer.html`~~ (migrated) | 42 | Company info, social links, copyright |
| `BottomNav.astro` | ~~`legacy/partials/bottom-nav.html`~~ (migrated) | 68 | Mobile nav (admin 6 tabs + kandidat 3 tabs) |
| `BaseLayout.astro` | ~~`legacy/partials/head.html`~~ + new | 68 | HTML shell, meta tags, fonts, SW registration |

## Compatibility Preserved

| Feature | Status | Detail |
|---------|--------|--------|
| `data-lang` attributes | ✅ | i18n keys intact for seam dispatcher |
| `data-action` attributes | ✅ | All button actions preserved |
| `data-action-arg` attributes | ✅ | JSON args for admin/kandidat nav |
| Font Awesome icons | ✅ | CDN link in BaseLayout |
| Montserrat font | ✅ | Google Fonts CDN |
| Meta tags (PWA) | ✅ | theme-color, apple-mobile-web-app-capable |
| `onerror` fallback | ✅ | Logo image fallback preserved |

## Pages Generated

| Route | File | Status |
|-------|------|--------|
| `/` | `index.astro` | ✅ Hero + quick links + stats |
| `/candidate` | `candidate.astro` | ⏳ Placeholder (Fase 4) |
| `/admin` | `admin.astro` | ⏳ Placeholder (Fase 4) |
| `/public` | `public.astro` | ⏳ Placeholder (Fase 4) |

## Build Output

| Metric | Value |
|--------|-------|
| Pages | 4 |
| Build time | 1.17s |
| Total JS | ~22KB (9.2KB gzip) |
| HTML pages | 4 static files |

## Migration Notes

1. **CSS**: ~~Legacy `main.css` (50KB)~~ → Tailwind v4 utilities (zero-config)
2. **Fonts**: Local `/fonts/` → Google Fonts CDN (preload Montserrat)
3. **Font Awesome**: Local `/vendor/font-awesome/` → CDN 6.5.1
4. **Scripts**: ~~Legacy `<script type="module">`~~ → Astro `<script>` (bundled)
5. **Nav modes**: `!hidden` classes preserved for JS toggle (admin/kandidat/public)

## Next (Fase 3)

- Create `src/store/userStore.ts` (nanostores)
- Implement Supabase Auth listener
- Mount auth state in BaseLayout.astro

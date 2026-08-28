# FASE 1: Setup Astro + Preact — DEEP Analysis

## Status: ✅ COMPLETE

## Stack

| Tech | Version | Purpose |
|------|---------|---------|
| Astro | ^5.12.0 | SSG/SSR framework — static-first |
| Preact | ^10.25.0 | Lightweight UI (3KB gzip) |
| @astrojs/preact | ^4.0.0 | Preact integration for Astro |
| nanostores | ^0.11.0 | Atomic state management |
| @nanostores/preact | ^0.5.0 | Preact bindings for nanostores |
| Tailwind CSS | v4 | Utility-first CSS via @tailwindcss/vite |
| TypeScript | ^5.8.0 | Type safety with allowJs:true |

## Directory Structure

```
asj-astro/
├── legacy/              ← Full codebase lama (255 files, 6MB)
│   ├── js/              ← TypeScript/JS source
│   ├── netlify/         ← Backend functions
│   ├── partials/        ← HTML partials
│   ├── docs/            ← DEEP docs
│   ├── e2e/             ← E2E tests
│   ├── assets/          ← Built bundles
│   └── *.html           ← Standalone pages
├── src/
│   ├── pages/           ← Astro pages (file-based routing)
│   │   └── index.astro  ← Landing page
│   ├── components/      ← Preact components (.tsx)
│   ├── layouts/         ← Astro layouts
│   │   └── BaseLayout.astro
│   ├── store/           ← Nanostores state
│   └── styles/
│       └── global.css   ← Tailwind import
├── public/              ← Static assets
│   └── favicon.svg
├── astro.config.mjs     ← Astro + Preact + Tailwind config
├── tsconfig.json        ← TypeScript config (allowJs:true)
├── package.json         ← ESM + Astro scripts
└── .gitignore
```

## Build Output

| File | Size (gzip) |
|------|-------------|
| `index.html` | ~1KB |
| `client.BIoPIZhi.js` | 0.06KB |
| `signals.module.Bh-bEDlZ.js` | 9.55KB (3.68KB gzip) |
| `client.4phKPBgB.js` | 12.58KB (5.43KB gzip) |
| **Total JS** | **~22KB** (9.2KB gzip) |

## Key Decisions

1. **Tailwind v4 via @tailwindcss/vite** — no PostCSS, no config file, just `@import "tailwindcss"`
2. **Static output** — Astro SSG for fastest load, SSR can be enabled later
3. **allowJs:true** — allows gradual migration from .js → .ts/.tsx
4. **Legacy folder** — full old codebase preserved for reference during migration

## Migration Strategy

Refer to `legacy/` folder when migrating each page:
1. Read old HTML structure from `legacy/*.html`
2. Extract layout → `src/layouts/`
3. Extract components → `src/components/*.tsx` (Preact)
4. Extract logic → `src/store/` (nanostores)
5. Create Astro page → `src/pages/*.astro`

## Next (Fase 2)

- Migrasi layout statis: header, footer, navbar → BaseLayout.astro
- Pindahkan CSS dari `legacy/assets/main.css` → Tailwind utilities
- Buat placeholder pages untuk setiap rute

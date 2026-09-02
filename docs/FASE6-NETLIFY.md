> **Last updated:** 2026-09-03 — Phase completed. This document is historical reference.

# FASE 6: Konfigurasi Netlify Build — DEEP Analysis

## Status: ✅ COMPLETE

## File Created

| File | Purpose |
|------|---------|
| `netlify.toml` | Build config + Cache-Control headers |

## Cache Strategy

```
┌─────────────────────────────────────────────────────┐
│ FILE TYPE          │ CACHE HEADER                   │
├─────────────────────────────────────────────────────┤
│ *.html             │ no-cache, no-store, must-reval │
│ /sw.js             │ no-cache, no-store, must-reval │
│ /_astro/*          │ max-age=31536000, immutable    │
│ /manifest.webmanifest │ max-age=86400 (1 day)      │
└─────────────────────────────────────────────────────┘
```

## Why This Works

1. **HTML + SW never cached** → Browser always checks server for latest
2. **Vite-hashed assets cached forever** → Same hash = same content, safe to cache
3. **Manifest cached 1 day** → Balance between freshness and performance

## Anti-Cache Triple Layer

```
Layer 1: netlify.toml headers → Browser HTTP cache
Layer 2: sw.js skipWaiting → SW activates immediately
Layer 3: ASJ_FORCE_RELOAD → Auto-refresh all tabs
```

## Build Pipeline

```
git push → Netlify detects change
  ↓
npm run build → astro build (Vite)
  ↓
dist/ → Published to CDN
  ↓
Headers applied per netlify.toml rules
```

## Deployment Checklist

- [x] netlify.toml with build command
- [x] Cache-Control headers for HTML/SW/assets
- [x] SW with skipWaiting + force reload
- [x] PWA manifest for installability
- [x] Connect Netlify site to GitHub repo → `khoci280-arch/asj-astro`
- [x] Set environment variables (Supabase, Netlify)
- [x] Test deploy on Netlify

## Live Deployment

| Resource | URL |
|----------|-----|
| **GitHub** | https://github.com/khoci280-arch/asj-astro |
| **Netlify** | https://incredible-starship-054a78.netlify.app |
| **Admin** | https://app.netlify.com/projects/incredible-starship-054a78 |

## Deploy Commands

```bash
# Build
npm run build

# Zip dist folder (Windows)
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath 'deploy.zip'"

# Upload to Netlify
curl -X POST "https://api.netlify.com/api/v1/sites/d2ba3305-6397-434e-bdba-71e71ce0b4f2/deploys" \
  -H "Authorization: Bearer nfp_DRuo5g3bfU1b6C4SMFf78WKeH34paBM4f5fb" \
  -H "Content-Type: application/zip" \
  --data-binary @deploy.zip
```

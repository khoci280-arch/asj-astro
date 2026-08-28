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
- [ ] Connect Netlify site to GitHub repo
- [ ] Set environment variables (Supabase, Gemini, etc.)
- [ ] Test deploy on Netlify

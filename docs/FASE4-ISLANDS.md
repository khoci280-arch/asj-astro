> **Last updated:** 2026-09-03 — Phase completed. This document is historical reference.

# FASE 4: Preact Islands — DEEP Analysis

## Status: ✅ COMPLETE (Foundation)

## Components Created

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `Toast.tsx` | `src/components/Toast.tsx` | 65 | Notification system (success/error/info/warning) |
| `LoginModal.tsx` | `src/components/LoginModal.tsx` | 65 | Kandidat login/register + Admin 3-step login |

## Preact Islands Architecture

```
src/components/
├── Toast.tsx         ← client:load (always visible)
├── LoginModal.tsx    ← client:load (shown on demand)
├── Header.astro      ← Static (no interactivity needed)
├── Footer.astro      ← Static
└── BottomNav.astro   ← Static (JS toggles visibility)

src/pages/
└── index.astro       ← Mounts Toast + LoginModal via client:load
```

## How Islands Work

```astro
<!-- In index.astro -->
<Toast client:load />                    <!-- Hydrate immediately -->
<LoginModal client:load mode="closed" /> <!-- Hydrate, start hidden -->
```

- `client:load` = hydrate immediately on page load
- `client:visible` = hydrate when scrolled into view (for below-fold)
- `client:idle` = hydrate when browser is idle

## State Flow

```
Toast.tsx
  └→ toasts atom (nanostores)
  └→ showToast(text, type) function
  └→ Auto-dismiss after 4s

LoginModal.tsx
  └→ userStore (nanostores) for auth state
  └→ loginAsAdmin() / loginAsKandidat() for persistence
  └→ callAPI() → Netlify functions backend
  └→ On success: reload page to apply new nav state
```

## Compatibility

| Legacy Pattern | New Pattern |
|----------------|-------------|
| `showToast(msg, type)` | `showToast(msg, type)` (same API) |
| `bukaModalKandidat('login')` | `<LoginModal mode="login" />` |
| `prosesLoginKandidat()` | `handleLogin()` in LoginModal |
| `document.getElementById(...)` | React state (useState) |

## What's NOT Migrated Yet

These are large components that will be migrated incrementally:

- Admin Dashboard (tabs, tables, modals)
- Candidate Dashboard (CV preview, status)
- Public Loker (job listings, detail)
- AI Chat interfaces
- Document upload/modals
- E-Sign canvas

Each will be a separate Preact component mounted with `client:load` or `client:visible`.

## Next (Fase 5)

- Implement aggressive Service Worker (sw.js)
- skipWaiting + caches.delete on activate
- Auto-reload on SW update

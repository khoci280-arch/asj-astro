# index + admin - Deep Analysis (Astro + Preact)

> Halaman utama: App.tsx (header) + AdminPanel.tsx (multi-tab).

## Component Map

| Legacy | Astro Component | Lines |
|--------|----------------|-------|
| header.html | App.tsx | 114 |
| page-public | LokerTable.tsx | 168 |
| page-public (layanan) | LayananSection.astro | 150 |
| page-admin | AdminPanel.tsx | 150 |
| admin tabs (8) | Tab*.tsx | 180-300 each |
| page-kandidat | CandidateDash.tsx | 338 |

## State: Nanostores (authStore, langStore, adminStore)
## Backend: get-app-data, candidates, jobs, config, whatsapp, ai-chat, run-migration, auth
## i18n: t() from store/i18n.ts, ~600+ keys

> **Last updated:** 2026-09-03. All 9 pages are live. Admin panel fully functional with real Supabase data.

# Pages — Quick Reference (Astro + Preact)

> Index ringkas semua halaman. Detail lengkap ada di docs/*-DEEP.md.

---

## Ringkasan Struktur

Pages (Astro SSG — src/pages/):
  index.astro       — Hub utama (publik + loker + layanan)
  admin.astro       — Panel admin (admin only)
  candidate.astro   — Dashboard kandidat (auth required)
  public.astro      — Lowongan publik (loker table)
  ai-cv.astro       — Chat AI + form CV bilingual (split view)
  master.astro      — Form master biodata 5 langkah + login gate
  siswa-baru.astro  — Chat AI + form pendaftaran siswa (split view)
  apply.astro       — Form lamaran 3 langkah
  share.astro       — Public share viewer untuk kaisha

---

## Dependensi per Halaman

| Halaman | Preact Component | Backend Functions | DB Tables | DEEP Doc |
|---------|-----------------|-------------------|-----------|----------|
| index.astro | App + LokerTable + LayananSection | get-app-data, bridge-links | jobs | index-admin-DEEP.md |
| admin.astro | App + AdminPanel + 8 Tab*.tsx | bridge-links, candidates, jobs, config, whatsapp | multiple | index-admin-DEEP.md |
| candidate.astro | App + CandidateDash | bridge-links, auth | database_candidate | candidate-DEEP.md |
| public.astro | App + LokerTable | get-app-data | jobs | index-admin-DEEP.md |
| ai-cv.astro | App + AiCvForm | bridge-links (processAIChat, submitDataAsj) | master_database_candidate | ai_form-DEEP.md |
| master.astro | App + MasterFullForm | bridge-links (loginKandidat, submitMasterForm) | master_database_candidate | master-full-DEEP.md |
| siswa-baru.astro | App + SiswaBaruForm | bridge-links (processSiswaAIChat, submitDaftarSiswa) | respon_siswa_baru | siswa-baru-DEEP.md |
| apply.astro | App + ApplyFullForm | bridge-links (cekDataPelamar, submitApply) | database_asj_form | apply-full-DEEP.md |
| share.astro | ShareView | share-data (GET) | 5 tables (READ) | share-DEEP.md |

---

## Shared Components

| Component | Digunakan Oleh | Fungsi |
|-----------|----------------|--------|
| BaseLayout.astro | Semua halaman | Shell HTML + SW installer |
| App.tsx | Semua kecuali share | Header + Nav + LoginModal + BottomNav |
| Toast.tsx | Semua halaman | Notifikasi reaktif |
| FormToolbar.tsx | ai-cv, master, siswa-baru, apply | Portal + Dark mode + Lang toggle |
| LoginModal.tsx | App.tsx | Form autentikasi |
| Footer.astro | Semua halaman | Social links + Copyright |
| BottomNav.astro | Semua halaman | Mobile bottom navigation |

---

## Shared Libraries

| File | Digunakan Oleh | Fungsi |
|------|----------------|--------|
| src/lib/apiClient.ts | Semua komponen | Centralized fetch wrapper (HMAC token) |
| src/lib/schemas.ts | Semua form | Zod validation schemas |
| src/lib/supabase.ts | Auth components | Supabase client + session listener |
| src/store/authReactive.ts | Semua komponen | Nanostores: auth state |
| src/store/i18n.ts | Semua komponen | Nanostores: i18n (t() function) |
| src/store/adminStore.ts | Admin components | Nanostores: admin data |

---

## Build Pipeline

Source (.astro, .tsx, .ts) -> Vite (Astro) -> Output (dist/)
  src/pages/*.astro       -> dist/*/index.html (static SSG)
  src/components/*.tsx    -> dist/_astro/*.js (islands hydration)
  src/lib/*.ts            -> dist/_astro/*.js (shared bundles)
  src/store/*.ts          -> dist/_astro/*.js (state bundles)
  public/sw.js            -> dist/sw.js (Service Worker)
  public/manifest.webmanifest -> dist/manifest.webmanifest

Dev: npm run dev (Astro dev server + Vite HMR + Vite proxy)
Prod: npx astro build -> dist/ (static files)
Preview: node server.cjs (dist/ + function proxy to production)

---

## PWA & Cache Strategy

| Layer | Strategy | File |
|-------|----------|------|
| SW install | skipWaiting() — langsung aktif | public/sw.js |
| SW activate | Delete old cache + clients.claim() | public/sw.js |
| SW fetch | Network-first -> cache -> index.html fallback | public/sw.js |
| Netlify HTML | no-cache, no-store, must-revalidate | netlify.toml |
| Netlify assets | max-age=31536000, immutable (hashed filenames) | netlify.toml |
| Client reload | Auto-detect SW update -> page reload | BaseLayout.astro |

---

## Hubungan Antar Halaman

index.astro (Hub Utama)
  -> /public      (Lowongan Loker)
  -> /apply       (Form Lamaran — ?job=&bidang=&wa=&nama=&req=)
  -> /master      (Form Master — ?wa=&nama=)
  -> /ai-cv       (AI CV — ?flow=master&job=&bidang=&wa=&nama=)
  -> /siswa-baru  (Program Kelas)
  -> /share       (Share View — ?code=CODE)
  -> /candidate   (Dashboard Kandidat — auth required)
  -> /admin       (Admin Panel — admin login required)

apply/master/ai-cv/siswa-baru -> / (Back to Portal via FormToolbar)

---

## Workflow: Sentuh Kode

1. Baca docs/HTML_PAGES.md (index ini) -> identifikasi halaman
2. Baca docs/<halaman>-DEEP.md -> pahami arsitektur + dependensi + flow
3. Plan perubahan -> pastikan tidak merusak pipeline atau SW cache
4. Fix kode (src/components/*.tsx atau src/pages/*.astro)
5. npx astro build -> verify tidak ada error
6. Update DEEP doc jika ada perubahan struktur
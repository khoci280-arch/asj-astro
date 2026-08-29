# HTML Pages — Quick Reference (Astro + Preact)

> Index ringkas semua halaman Astro. Detail lengkap ada di `docs/*-DEEP.md`.

---

## Ringkasan Struktur

```
Halaman Astro (src/pages/):
├── index.astro        — Hub utama (publik: loker + layanan)
├── admin.astro        — Panel admin (multi-tab)
├── candidate.astro    — Dashboard kandidat
├── public.astro       — Public loker page
├── share.astro        — Public share viewer untuk kaisha
├── apply.astro        — Form lamaran 3 langkah
├── master.astro       — Form master biodata 5 langkah + login gate
├── ai-cv.astro        — Chat AI + form CV bilingual (split view)
└── siswa-baru.astro   — Chat AI + form pendaftaran siswa (split view)

Layout & Shared:
├── layouts/BaseLayout.astro    — Shell HTML + SW + marquee + footer
├── components/App.tsx           — Header + mobile nav (Preact island)
├── components/Toast.tsx         — Toast notification system
├── components/LoginModal.tsx    — Login/register modal
├── components/Footer.astro      — Social links + copyright
├── components/BottomNav.astro   — Mobile bottom navigation
└── components/Skeleton.astro    — Loading skeletons
```

---

## Mapping Legacy → Astro

| Legacy | Astro | Perubahan |
|--------|-------|-----------|
| `index.html` (bundle) | `index.astro` + `App.tsx` + `LokerTable.tsx` + `LayananSection.astro` | Split into components, Nanostores state |
| `admin.html` (bundle) | `admin.astro` + `AdminPanel.tsx` + 8 tab components | Split into per-tab Preact components |
| `apply-full.html` (standalone) | `apply.astro` + `ApplyFullForm.tsx` | Preact island with Zod validation |
| `master-full.html` (standalone) | `master.astro` + `MasterFullForm.tsx` | Preact island with Zod validation |
| `ai_form.html` (standalone) | `ai-cv.astro` + `AiCvForm.tsx` | Preact island, Nanostores for CV state |
| `siswa-baru.html` (standalone) | `siswa-baru.astro` + `SiswaBaruForm.tsx` | Preact island |
| `share.html` (standalone) | `share.astro` + `ShareView.tsx` | Preact island |
| JS bundle `app-*.js` | Split into 12+ Preact components | Component-based architecture |
| `localStorage` auth | `authReactive.ts` (Nanostores) | Reactive cross-tab sync |
| `data-lang` attributes | `i18n.ts` + `t()` helper | Nanostores-based i18n |
| `window.*` globals | ES module imports | Type-safe imports |

---

## Dependensi per Halaman

### Layout Layer

| File | Tipe | Digunakan Oleh | Fungsi |
|------|------|----------------|--------|
| `layouts/BaseLayout.astro` | Layout | Semua halaman | Shell HTML, meta, SW, marquee, footer |
| `components/App.tsx` | Preact | Semua halaman | Header, mobile nav, login modal, auth state |
| `components/Toast.tsx` | Preact | Semua halaman | Toast notification system |

### Public Pages

| Halaman | Preact Components | Backend Functions | DB Tables |
|---------|-------------------|-------------------|-----------|
| `/` (index) | `LokerTable.tsx`, `LayananSection.astro` | `get-app-data` | `job_database` |
| `/public` | `LokerTable.tsx`, `LayananSection.astro` | `get-app-data` | `job_database` |
| `/share` | `ShareView.tsx` | `share-data` | `database_candidate`, `database_asj_form`, `pemberkasan_checklist`, `master_database_candidate` |

### Candidate Pages

| Halaman | Preact Components | Backend Functions | DB Tables |
|---------|-------------------|-------------------|-----------|
| `/candidate` | `CandidateDash.tsx` | `candidates`, `bridge-links` | `database_candidate`, `master_database_candidate` |
| `/apply` | `ApplyFullForm.tsx` | `candidates`, `apply` | `database_asj_form`, `database_candidate`, `master_database_candidate` |
| `/master` | `MasterFullForm.tsx` | `auth`, `master-data` | `master_database_candidate`, `database_candidate` |
| `/ai-cv` | `AiCvForm.tsx` | `ai-chat`, `master-data`, `get-app-data`, `ai-form-submit` | `master_database_candidate`, `database_candidate`, `ai_form_submissions` |
| `/siswa-baru` | `SiswaBaruForm.tsx` | `ai-chat`, `ai-form-submit` | `respon_siswa_baru` |

### Admin Pages

| Halaman | Preact Components | Backend Functions | DB Tables |
|---------|-------------------|-------------------|-----------|
| `/admin` | `AdminPanel.tsx` + 8 tabs | `get-app-data`, `candidates`, `jobs`, `config`, `whatsapp`, `schedule-reminders`, `run-migration`, `ai-chat` | Multiple |

---

## Admin Tab Components

| Tab | Component | Backend Functions |
|-----|-----------|-------------------|
| Kelola Loker | `TabKelola.tsx` | `get-app-data`, `jobs` |
| DB Job Internal | `TabDbJob.tsx` | `get-app-data` |
| Tambah Job | `TabTambah.tsx` | `jobs` |
| Data Pelamar | `TabPelamar.tsx` | `candidates` |
| Jadwal Agenda | `TabJadwal.tsx` | `config`, `schedule-reminders` |
| Mail Inbox | `TabMail.tsx` | `candidates` |
| WA Pintar | `TabWA.tsx` | `config`, `whatsapp` |
| Pengaturan | `TabConfig.tsx` | `config`, `run-migration` |

---

## Shared Libraries

| File | Fungsi | Digunakan Oleh |
|------|--------|----------------|
| `lib/apiClient.ts` | Fetch wrapper with HMAC token | Semua komponen |
| `lib/auth.ts` | Login/logout via Supabase | `LoginModal.tsx` |
| `lib/schemas.ts` | Zod validation schemas | Semua form |
| `store/authReactive.ts` | Auth state (Nanostores) | Semua komponen |
| `store/i18n.ts` | Translation state (Nanostores) | Semua komponen |
| `store/adminStore.ts` | Admin panel state | Admin tabs |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 5.18 (SSG/SSR) |
| Islands | Preact + `client:load` directive |
| State | Nanostores (`@nanostores/preact`) |
| Validation | Zod |
| Styling | Tailwind CSS 4 |
| API | Native fetch with HMAC wrapper |
| Auth | Supabase Auth |
| PWA | Service Worker (`sw.js`) + manifest |
| Build | Vite (built into Astro) |
| Deploy | Netlify (static + functions) |

---

## Navigation Map

```
/ (index) — Hub Utama
├── → /apply      (Form Lamaran — URL params: ?job=&bidang=&wa=&nama=&req=)
├── → /master     (Form Master — URL params: ?wa=&nama=)
├── → /ai-cv      (AI CV — URL params: ?flow=master&job=&bidang=&wa=&nama=)
├── → /siswa-baru (Program Kelas)
├── → /share      (Share View — URL params: ?job=CODE)
├── → /candidate  (Dashboard Kandidat)
└── → /admin      (Admin Panel)

/share (Public)
└── → wa.me/6287889502004 (WhatsApp ke admin)

/apply → / (Back to Portal)
/master → / (Back to Portal)
/ai-cv → / (Back to Portal)
/siswa-baru → / (Back to Portal)
/candidate → / (Back to Portal)
```

---

## Build Pipeline

```
Astro Build (npm run build):
├── src/pages/*.astro → dist/*.html (static HTML)
├── src/components/*.tsx → dist/_astro/*.js (Preact islands, code-split)
├── src/store/*.ts → dist/_astro/*.js (Nanostores)
├── src/lib/*.ts → dist/_astro/*.js (utilities)
├── src/styles/global.css → dist/_astro/*.css (Tailwind)
└── public/* → dist/* (static assets: sw.js, manifest, icons)

Output: dist/ (Netlify deploys this)
Functions: netlify/functions/*.js (compiled from .ts via esbuild)
```

---

## Workflow: Sentuh Kode

1. Baca `docs/HTML_PAGES.md` (index ini) → identifikasi halaman
2. Baca `docs/<halaman>-DEEP.md` → pahami arsitektur + dependensi + flow
3. Plan perubahan → pastikan tidak merusak Nanostores state atau Preact island
4. Fix kode
5. Update DEEP doc jika ada perubahan struktur
6. `npm run build` → verify tidak ada error
7. Update E2E test jika ada fitur baru

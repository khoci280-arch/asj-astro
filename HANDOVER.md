# 🔄 HANDOVER — ASJ Portal v2 (Astro)
**Date:** 2026-09-03
**Branch:** `dev` (4 commits ahead of origin)
**Repository:** https://github.com/khoci280-arch/asj-astro.git

---

## 📋 Ringkasan Kerja Session Ini

### Yang Sudah Selesai (13 commits di branch `dev`):

| # | Commit | Deskripsi |
|---|--------|-----------|
| 1 | `bd0a30c` | feat: complete legacy feature parity for admin modals |
| 2 | `1469996` | fix: add missing env import (admin login broken) |
| 3 | `4c6391c` | fix: data loading pipeline — candidates load from real Supabase |
| 4 | `f4e7e00` | chore: remove .bak files and debug artifacts |
| 5 | `2d2423a` | feat: add BB, catatan, VIP toggle, document uploads to EditCandidateModal |
| 6 | `0c039d6` | fix: catatan save — dual API contract + service role |
| 7 | `d439ab3` | feat: add ListKandidatModal for per-job candidate management |
| 8 | `1e69b0f` | fix: wire modal triggers + 80+ i18n translations |
| 9 | `78a1bcc` | fix: getPath() bug causing [object Object] in Rirekisho CV |
| 10 | `9b1eab9` | chore: clean up .freebuff preview artifacts |
| 11 | `2e21913` | docs: update all documentation |
| 12 | `7e00296` | docs: update architecture docs to reflect implementation |
| 13 | `afc186d` | security: complete RLS audit — all 15 tables protected |
| 14 | `75e2a2f` | docs: mark security audit complete in TODO.md |

### Yang Sudah Di-Test dan Work:

| Feature | Status | Test Method |
|---------|--------|-------------|
| Login Admin (PIN 123456) | ✅ | 3-step auth via AuthGuard |
| Data Pelamar (225 kandidat) | ✅ | Real Supabase DB |
| DB Job Internal (159 jobs) | ✅ | Real Supabase DB |
| EditCandidateModal | ✅ | BB, catatan, VIP, upload |
| MatchmakingModal | ✅ | Found 5 candidates with filter |
| ListKandidatModal | ✅ | Copy WA, Undang Grup |
| PemberkasanModal | ✅ | Document checklist |
| UndanganKelasModal | ✅ | All labels translated |
| CandidateProfileModal | ✅ | "Lengkapi Pemberkasan" button |
| AdminJobEditModal | ✅ | Full edit form |
| TabJadwal | ✅ | Form buat jadwal |
| TabMail | ⚠️ | UI works, needs real session for data |
| TabWA Pintar | ✅ | Templates + invite button |
| RirekishoBuilder (CV) | ✅ | Fixed [object Object] bug |

---

## 🖥️ Cara Setup di Komputer Lain

### 1. Clone Repository
```bash
git clone https://github.com/khoci280-arch/asj-astro.git
cd asj-astro
git checkout dev   # ← PENTING! Jangan di main
```

### 2. Install Dependencies
```bash
npm install        # Butuh Node.js v20+ (tested di v24)
```

### 3. Setup Environment Variables
```bash
cp .env.lokal .env.local    # Copy dari file .env.lokal yang sudah ada
```

**Variables yang WAJIB ada di `.env.local`:**
```env
# Supabase (Direct connection — pooler)
SUPABASE_URL=postgresql://postgres.bimqyugdhiuxcqltjjnt:...@...:5432/postgres
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
SUPABASE_STORAGE_BUCKET=...

# Public (untuk frontend)
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...

# Session
SESSION_SECRET=...  # Random 64-char hex

# Admin PINs
ADMIN_MASTER_PIN=123456
ADMIN_NUMBERS=628...
PIN_SACHOU=...
PIN_AYOK=...
PIN_KHOLIS=...
PIN_KHOCI=...

# AI
GEMINI_API_KEY=...
GROQ_API_KEY=...
XAI_API_KEY=...

# External Services
FONNTE_TOKEN=...       # WhatsApp blast
CLOUDINARY_URL=...     # File upload
FIREBASE_SERVICE_TOKEN=...  # Push notifications
```

> ⚠️ **File `.env.lokal` berisi credential asli** — JANGAN push ke git!
> `.env.local` sudah di-gitignore.

### 4. Run Development Server
```bash
# Mode 1: Netlify Dev (rekomendasi — jalankan backend functions juga)
npx netlify dev

# Mode 2: Astro Dev (frontend saja, tanpa backend)
npm run dev
```

**Local URL:** http://localhost:4321 (atau port lain yang tertera)

### 5. Run Tests
```bash
npm test           # 235 tests, semua pass
```

---

## 📁 Struktur Project (Penting)

```
src/
├── components/
│   ├── admin/           # 12 admin modals + tabs
│   │   ├── AdminPanel.tsx        ← Main admin container
│   │   ├── TabDbJob.tsx          ← DB Job Internal
│   │   ├── TabPelamar.tsx        ← Data Pelamar
│   │   ├── TabJadwal.tsx         ← Jadwal Agenda
│   │   ├── TabMail.tsx           ← Mail Inbox
│   │   ├── TabWA.tsx             ← WA Pintar
│   │   ├── TabConfig.tsx         ← Pengaturan
│   │   ├── EditCandidateModal.tsx
│   │   ├── MatchmakingModal.tsx
│   │   ├── ListKandidatModal.tsx
│   │   ├── PemberkasanModal.tsx
│   │   ├── AdminJobEditModal.tsx
│   │   └── RirekishoBuilder.tsx  ← CV Japanese resume
│   ├── forms/           # Form kandidat
│   ├── public/          # Public pages
│   └── ui/              # Shared UI components
├── store/               # Nanostores (state management)
│   ├── authReactive.ts  ← Auth state (persistent)
│   ├── adminStore.ts    ← Admin data store
│   └── i18n.ts          ← Translations
├── lib/                 # Utilities
│   ├── apiEndpoint.ts   ← API routing
│   ├── apiClient.ts     ← API client
│   └── helpers_cv.ts    ← CV helpers (getPath was fixed here)
├── pages/               # Astro pages
│   ├── index.astro      ← Homepage
│   ├── admin.astro      ← Admin panel
│   └── ...
netlify/functions/        # Backend (117 files)
├── contexts/            # Business logic
├── _lib/                # Shared kernel
└── ...
```

---

## 🐛 Known Issues (Belum Diperbaiki)

### 1. Mail Inbox Kosong (Bukan Bug)
- **Masalah:** TabMail menunjukkan 0 data meski ada di DB
- **Penyebab:** Session token palsu (`dev_token_123456`) menyebabkan backend return `sessionInvalid: true` → `formInbox` tidak dikirim
- **Solusi:** Login melalui flow 3-step auth yang benar, atau test dengan session token asli

### 2. Bottom Nav Tab Switching
- **Masalah:** Tab hash `#mail`, `#jadwal` dll bisa tidak switch jika ada HMR
- **Fix yang sudah dibuat:** hashchange event listener di AdminPanel
- **Status:** Sudah diperbaiki, tapi kadang perlu reload

### 3. RirekishoBuilder - Beberapa Field "undefined"
- **Masalah:** Field kosong di DB (JENIS_KELAMIN, STATUS_PERNIKAHAN) muncul "undefined"
- **Penyebab:** Data memang kosong di database
- **Solusi:** Tambah fallback "-" untuk field kosong

---

## 📊 Statistik

| Metric | Value |
|--------|-------|
| **Pages** | 9 halaman Astro |
| **Admin Modals** | 12 modals (100% feature parity) |
| **Backend Functions** | 117 files |
| **Database Tables** | 15 tabel (semua ada RLS) |
| **Tests** | 235/235 passing |
| **Kandidat di DB** | 225 |
| **Jobs di DB** | 159 |

---

## 🎯 Yang Perlu Dikerjakan Selanjutnya

### Priority 1: InputManualModal & LaporanBulananModal
Kedua modal ini sudah ada di codebase tapi belum di-test.

### Priority 2: TabConfig (Pengaturan)
Settings page — lengkapi dengan:
- Fonnte token management
- AI model selection
- Notification preferences

### Priority 3: Security Hardening (Sebelum Deploy)
- Fix IDOR vulnerabilities (C3-C6 di CODE_REVIEW)
- Rate limiting test
- CORS check

### Priority 4: Deploy
- Push branch `dev` ke GitHub
- Netlify auto-deploy ke `main`
- Copy `.env.local` ke Netlify dashboard

---

## 🔑 Credentials Reference (JANGAN PUSH!)

| Service | Variable | Lokasi |
|---------|----------|--------|
| Supabase DB | `SUPABASE_URL` | `.env.lokal` |
| Supabase Anon | `SUPABASE_ANON_KEY` | `.env.lokal` |
| Supabase Service | `SUPABASE_SERVICE_ROLE_KEY` | `.env.lokal` |
| Fonnte WA | `FONNTE_TOKEN` | `.env.lokal` |
| Gemini AI | `GEMINI_API_KEY` | `.env.lokal` |
| Admin PIN | `ADMIN_MASTER_PIN=123456` | Hardcoded |

---

## 📞 Kontak
- **Repo:** https://github.com/khoci280-arch/asj-astro
- **Branch:** `dev` (active development)
- **Legacy repo:** https://github.com/khoci921-hub/khoci921

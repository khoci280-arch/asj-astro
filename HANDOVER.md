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

---

# 🔄 HANDOVER Sesi 2026-09-04 — Astro template scope (indexer) + asesmen produksi

**Branch:** `dev` · **HEAD:** `d83f3b8` · **Catatan:** bagian di bawah ini ADALAH sesi hari ini;
bagian atas (2026-09-03) tetap dipertahankan untuk konteks kerja app.

## ⚠️ Hal pertama saat lanjut

**7 file fitur BELUM di-commit** dan tidak ikut `git push`. Commit dulu sebelum pindah/push:

```bash
git add docs/CODE_INDEX_DESIGN.md indexer/src/deep-tier.test.ts indexer/src/parse.test.ts \
        indexer/src/parse.ts indexer/src/validate.test.ts indexer/src/validate.ts \
        indexer/validate-report.json HANDOVER.md

git commit -m "feat(indexer): astro template scope — symbol-level interpolations

{expr} reads in .astro templates (text + attr values, recursing into
JSX-in-expression) emit Read occurrences in an AstroTemplate scope child of the
frontmatter module scope, so lang in lang={lang} binds to the destructured
frontmatter const — def/hover at a template position answers with the
frontmatter declaration and idx refs on those consts lists the template sites
(5 on this tree). Template positions carry no compiler identifier (validate
receives frontmatter-stripped sources) and are excluded from differential
checks; full run stays 22,495/22,495, 0 disagreements. Scanner is conservative:
script/style bodies, comments, quoted attrs, backtick literals opaque; member
names/object keys/arrow params/keywords never emitted. Docs synced; 172
indexer tests (+9)."
```

## Fitur yang selesai sesi ini (terverifikasi, belum commit)

**Astro template scope — symbol-level interpolations** (roadmap row 8 §13):
- `indexer/src/parse.ts` (+~490 baris): scanner `scanAstroTemplateReads` + `emitAstroTemplateScope`
  (scope `AstroTemplate` anak module scope frontmatter; occurrence `Read` per identifier interpolasi)
- `indexer/src/validate.ts`: occurrence berscope template di-skip dari universe compiler
  (program hanya terima frontmatter) → bucket deviasi `skippedAstroTemplate`
- Test: `parse.test.ts` +6, `deep-tier.test.ts` +2 (fixture .astro + real-tree BaseLayout),
  `validate.test.ts` +1 → suite indexer **13 file / 172 test hijau**

**Angka terverifikasi:** refs 22.500 (light 21.451 + deep 1.049, +5 = interpolasi BaseLayout),
full validate **22.495/22.495 (100%), 0 disagreements**, sample 3.482/3.482 (lib 1.133),
`idx:gate` 4/4, `boundary` 0, typecheck app+indexer bersih.

## Asesmen produksi (ringkas)

Kode siap **±85–88%**; sisanya operasional bukan kode:
- Terbukti: `npm run build` hijau (9 halaman ~18 dtk), unit app 26 file/241 hijau,
  pipeline rilis lengkap (CI 8 gate, staging `develop`, prod tag `v*`, smoke + auto-rollback).
- Yang menahan: e2e Playwright belum jalan utk kondisi ini; `verify:env`/`verify:db` butuh env asli;
  keputusan SSR menggantung (`output:'server'`/`adapter:netlify()` masih komentar di
  `astro.config.mjs` — berjalan statis+functions, konsisten dgn `netlify.toml`);
  branch `dev` tidak auto-deploy (rilis lewat `develop`/tag).
- Catatan: `.env.lokal` BUKAN sampah — itu file env lokal sesungguhnya (lihat tabel credentials di atas).

## Next steps (per 2026-09-04 larut — setelah Astro.glob expansion + row-9 read surfaces + row-5 §8 pass)

1. Commit sesi-sesi ini: `e6f0982` (astro template scope) sudah di HEAD; tiga fitur indexer
   berikut MASIH di working tree, BELUM di-commit — (a) Astro.glob expansion (10 file + 2 baru),
   (b) row-9 read surfaces (query.ts, query.test.ts + docs), (c) row-5 §8 pass (query.ts,
   serve.ts, query.test.ts + docs). Ketiganya berbagi file (`query.ts`, kedua dokumen) →
   commit terpisah butuh `git add -p` per hunk.
2. Roadmap indexer tersisa: **row 6 §6.2** (incremental engine: dirty sets, hash-split impact
   analysis, per-file reuse + WS push) dan **§8 tail** (role-filtered refs, callers/callees,
   implementations, rename-plan, symbol search-by-filter, /graph); TypeParams scopes + CJS
   export symbols masih deferred. Row 9 full closed; row-5 read-surface (symbol/file/edge
   endpoints + `?gen=`) shipped sesi ini.
3. Pra-rilis app: `npm run ci:quality` penuh; finalisasi keputusan SSR; e2e + verify DB di staging.

---

# 🔄 HANDOVER Sesi 2026-09-04 (sore) — Astro.glob expansion (row 8)

**Branch:** `dev` · Row-8 open remainder **Astro.glob expansion** selesai; perubahan di bawah
+ sync docs (`CODE_INDEX_DESIGN.md`, `HANDOVER.md`) **belum di-commit** (commit sesuai saran
di bagian "Next setelah sesi ini").

## Ringkasan fitur

- **parse.ts:** frontmatter `Astro.glob('…')` dengan argumen string literal direkam sebagai
  `AstroGlobCall` (di `walkCall`) — argumen non-literal, receiver selain `Astro`, dan file
  non-astro tidak pernah direkam. Property `astroGlobs` hanya ada di file `.astro`.
- **astroGlob.ts (baru):** matcher subset fast-glob (`*` dalam satu segmen, `**` lintas segmen,
  `?`, `[...]`, `{a,b}`) — pola relatif ke direktori file importer, pola berawalan `/` relatif
  ke repo root, case-insensitive. Wildcard tidak bisa keluar direktori importer: kandidat di
  luar direktori (rel berawalan `../`) hanya cocok bila polanya sendiri diawali `../` literal.
- **graph.ts + build.ts:** tiap call diekspansi menjadi module edge `EdgeType.AstroGlob` (15,
  specifier = pola mentah, tanpa bindings — glob impor seluruh modul, bukan nama) per file yang
  cocok; pola tanpa match menjadi unresolved `astro-glob-no-match` (health signal, bukan no-op).
- **query.ts / dump.ts:** label edge `astro-glob`, dep-type `dynamic-import`, doc dump additive
  (types 3..6 saja tidak diasumsikan — Renders 13 + AstroGlob 15).
- **Test:** `astroGlob.test.ts` baru (matcher + fixture pipeline penuh), `parse.test.ts` +3
  (deteksi glob), `build.test.ts` +1 (real tree: 0 usage).

**Angka terverifikasi:** real tree zero `Astro.glob` usage → 0 edge AstroGlob / 0 unresolved
`astro-glob-no-match`; angka global (refs, validate 22.495/22.495) tidak berubah; typecheck
indexer + suite indexer **14 file / 184 test hijau** (+12: astroGlob 8 baru, parse +3, build +1).

## Next setelah sesi ini

- Commit/push sesi ini (jangan push tanpa izin; `dev` sudah 5+ commit ahead of origin).
- Row-9 remainder / pra-rilis app seperti daftar Next steps di atas.

## Command reference (dari root repo)

```bash
npm run typecheck:indexer
npm run idx:build   # wajib sebelum jalankan dist
npx vitest run --project indexer          # suite indexer (≈2 mnt; deep tier ~6,4 dtk/build)
node indexer/dist/indexer/src/validate.js --sample     # sample + tulis ulang validate-report.json
node indexer/dist/indexer/src/validate.js              # full-run (≈2 mnt)
npm run idx:gate && npm run boundary
npx tsc --noEmit && npm run test:frontend && npm run test:backend && npm run build
```

**Catatan lingkungan:** root lokal sesi ini `E:/astro` (docs header menulis `F:\astro` — beda mesin,
jangan dipakai untuk perintah). Windows + Git Bash; dump index ~10,6 MiB deterministic.

---

# 🔄 HANDOVER Sesi 2026-09-04 (malam) — Row-9 read-surface rendering

**Branch:** `dev` · Row-9 remainder ditutup: `detail`/`typeRef`/`kind` sekarang dirender di
semua permukaan def/hover read surface. Perubahan BELUM di-commit (menumpuk di working tree
bersama fitur Astro.glob expansion sesi sebelumnya).

## Ringkasan

- **query.ts:** (1) `fileSymbols` (GET /symbols outline) tidak lagi membuang `detail` + `typeRef`
  dari proyeksi entry (schema: detail = "rendered signature for hover"; entry outline harus
  menjawab hover seperti posisi yang dicakupnya); (2) `RefView` (GET /refs, idx refs/impact,
  `refsOfLib` untuk lib target) membawa `kind` + `detail` target; (3) `SearchHit` (GET /search)
  membawa `detail`. Semua additive optional — snapshot legacy tanpa detail tetap load, tanpa
  perubahan wire kontrak lama.
- **query.test.ts** +2 (describe baru "row-9 read surfaces": fixture synthetic dgn detail dan
  tanpa detail di outline/refs/search) + assertion real-tree di outline/refs/search/HTTP
  (simbol FINDBYWA).
- **Docs:** CODE_INDEX_DESIGN.md — klausa "row-9 open remainder" dihapus dari status (baris
  remaining-work + status tail), paragraf §13 baru "Row-9 read-surface rendering".

**Angka terverifikasi:** `npm run typecheck:indexer` bersih; suite indexer **14 file / 186 test
hijau** (+2 dari sesi ini, di atas 184); `npm run idx:gate` exit 0 (4/4); `npm run boundary`
exit 0 (0 violations). Real-tree counts tidak berubah (view-layer only).

## Next setelah sesi ini

- Commit ketiga fitur (Astro.glob expansion, row-9 read surface, row-5 §8 pass) — berbagi file
  (`docs/CODE_INDEX_DESIGN.md`, `HANDOVER.md`, `indexer/src/query.ts`, plus `serve.ts` untuk
  row-5), jadi `git add -p` per hunk untuk commit terpisah, atau satu kesatuan kalau disepakati.
  Jangan push tanpa izin.
- Lanjut row 6 §6.2 (daftar Next steps di atas).

---

# 🔄 HANDOVER Sesi 2026-09-04 (larut) — Row-5 §8 read-surface pass

**Branch:** `dev` · Row-5 remainder (bagian read-surface) selesai: endpoint §8 symbol/file/edge
+ validasi `?gen=`. Perubahan BELUM di-commit (menumpuk bersama dua fitur sebelumnya).

## Ringkasan

- **query.ts (view murni baru):** `symbolCardOf` (kartu simbol §8.1 — decls[], hover markdown
  LSP-shape dari `detail` difence ```ts, container, export flags, refs count, centrality),
  `fileUnresolvedOf` (unresolved per-file: baris occurrence + import dengan reason),
  `depsPathOf` (BFS shortest path atas file-to-file importEdges; state found/unreachable/
  unknown terpisah), `depsOrphansOf` (file yang tidak diimpor siapa pun).
- **serve.ts (route URL-param gaya §8):** `GET /sym/:symId` (404 utk unknown; symId boleh berisi
  `/` karena embed path repo), `GET /files/:path/unresolved` (200 + fileFound:false utk unknown),
  `GET /deps/path?from&to`, `GET /deps/orphans`. `?gen=` divalidasi di semua read yang membawa
  gen: hanya epoch berjalan yang dilayani; gen lain → 400 dgn pesan kontrak retensi (history =
  diff, bukan snapshot; baca historis penuh = follow-up /diff durability).
- **query.test.ts** +6 (total 58): real-tree card/file-unresolved/path/orphans, synthetic
  unresolved+BFS, HTTP contract incl. error ?gen.
- **Docs:** CODE_INDEX_DESIGN.md — §8 header/§8.1/§8.3 ditandai live, sel row 5 + remaining-work
  + status tail + paragraf §13 baru.

**Angka terverifikasi:** `npm run typecheck:indexer` bersih; suite indexer **14 file / 192 test
hijau** (+6 dari sesi ini, di atas 186); `npm run idx:gate` exit 0 (4/4); `npm run boundary`
exit 0 (0 violations). Real-tree counts tidak berubah (view-layer only).

## Next setelah sesi ini

- Commit tiga fitur (lihat Next steps di atas).
- Lanjut row 6 §6.2 incremental engine + WS push; §8 tail opsional di belakangnya.

---

# 🔄 HANDOVER Sesi 2026-09-04 — Commit 3 fitur + Row 6 §6.2 (per-file parse reuse)

**Branch:** `dev` (8 commit ahead of origin/dev) · Dua hal: (1) tiga fitur indexer yang menumpuk
di-commit terpisah via hunk selection; (2) row 6 §6.2 — per-file parse reuse — terimplementasi
(dan BELUM di-commit, menunggu review).

## Sesi A — Commit terpisah (tiga fitur)

- `05c6557 feat(indexer): Astro.glob expansion — module edges from frontmatter glob calls` (10 file: astroGlob.ts/.test.ts baru, parse/graph/build/dump/schema, hunk EDGE_DEP_TYPE query.ts)
- `f250e4b feat(indexer): row-9 read surfaces — detail/kind carried on outline, refs, search` (query.ts hunks 1–7 + query.test.ts row-9 hunks)
- `b2c04b3 feat(indexer): §8 read endpoints — symbol card, file unresolved, deps path/orphans, gen pinning` (query view hunks + query.test.ts sisa + serve/cli + kedua dokumen utuh — teks doc kumulatif ketiga fitur tidak bisa dipecah per baris)
- Teknik: `git add -p` per hunk; satu hunk campur (describe row-9 + row-5 berdekatan) dipecah deterministik (backup → hapus sementara blok row-5 → stage → restore byte-identik). Setiap staging diverifikasi via `git diff --cached`.

## Sesi B — Row 6 §6.2 incremental engine (per-file parse reuse)

- **Mengapa scope ini:** pengukuran menunjukkan tiap bagian index cepat (build ~4,6 dtk dgn deep tier 3,7 dtk; validate 8 dtk; suite 46 dtk = dominan). Yang lambat = siklus verifikasi penuh berulang, BUKAN rebuild watch (~0,9 dtk). §6.2 tetap dibangun atas pilihan user; gain jujur = stage parse di rebuild watch.
- **Schema:** `IndexStats.parseReusedFiles` (additive optional).
- **build.ts:** `ParseCacheEntry`/`ParseReuseCache` + `BuildOptions.parseCache` — file dgn (content hash, fileIdx) sama dgn cache melewati Stage 2 (aman: parse murni, key pack fileIdx, tak ada stage downstream yg memutasi hasil parse → zero-copy). Entri basi diganti, file hilang di-prune.
- **watch.ts:** satu cache per sesi watch, dibawa lintas generasi (init mengisi; rebuild berikut reuse).
- **Terukur (deep off):** parse 470 ms → **1,3 ms** saat warm penuh; no-deep build ~0,64 s → **~0,14 s**; save satu file re-parse satu file. Output byte-identik dgn cold build (fixture-pinned: warm berulang, body edit, swap noise, deletion → ordinal shift → full reparse).
- **Non-goal jujur:** separuh dirty-set impact analysis (bind/resolve atas impact set) TIDAK dibangun — pass global ~0,1 dtk di tree ini, di bawah ambang fan-out desain 150 ms. WS push juga tetap open (row 6).
- Verifikasi: typecheck bersih; suite **14 file / 196 test hijau** (+4: build.test.ts §6.2 describe); `watch.e2e.js` & `cli.e2e.js` standalone exit 0; idx:gate/boundary lihat catatan bawah.

**Status commit:** 5 file + HANDOVER ini BELUM di-commit (schema, build.ts, build.test.ts, watch.ts, CODE_INDEX_DESIGN.md) — commit terpisah `feat(indexer): row 6 §6.2 — per-file parse reuse in idx watch` siap dibuat atas izin. Jangan push tanpa izin.

## Next setelah sesi ini

- Commit row 6 §6.2 (file di atas) — kalau mau, review dulu: ini mengubah inti build path (walaupun additive-optional).
- Verifikasi cepat saat iterasi fitur: jalankan HANYA test terdampak (`npx vitest run --project indexer indexer/src/<file>.test.ts`) + typecheck (~2 dtk); suite penuh 46 dtk cukup pra-commit; CI jalan `ci:quality` penuh.
- Row 6 sisa: dirty-set bind/resolve impact half (perlu hanya kalau repo tumbuh jauh) + WS push; §8 tail opsional.

---

# 🔄 HANDOVER Sesi 2026-09-04 — Backend auth endpoint hardening (audit C4/C5)

**Branch:** `dev` (9 commit ahead of origin/dev) · Pivot dari roadmap indexer ke backend
(atas permintaan user: "lanjutin backend saja, kelamaan mapping index"). Thread dipilih user:
tutup celah auth endpoint (audit) — verifikasi dulu, fix yang benar-benar terbuka.

## Hasil verifikasi

Sebagian besar item CODE_REVIEW 2026-09-01 (B1-B10, S1-S11) & audit SECURITY_AUDIT 2026-09-03
sudah tertutup refactor boundary + pass berikutnya — kode memuat komentar fix eksplisit
("B8 fix" verifyToken di userClient, "B9 fix" log.error, "S2 fix" exp token, "S3 fix" tanpa
fallback password, "S9 fix" CORS allow-list, "S10 fix" batas 10 MB, dll). Yang MASIH terbuka
di jalur PII kandidat & diperbaiki di pass ini:

## Perubahan (5 file, BELUM di-commit)

- `contexts/registration/service.ts` — `handleGetDaftarSiswaBaru` (roster SEMUA pendaftar)
  kini **admin-only** (sebelumnya kandidat terautentikasi bisa enumerasi PII nama/alamat
  pendaftar lain); `handleGenerateLegacyMasterBridge` + `handleGenerateAiFormBridge` (mencetak
  link berisi WA+nama kandidat) kini **wajib sesi admin**; `generateFormBridge` (prefill apply
  publik dari LokerTable) tetap publik.
- `surfaces/register.ts` — teruskan sessionToken ke dua bridge di atas.
- `contexts/master-data/service.ts` — `handleGetDrafCvMaster` verifikasi sesi + owner-or-admin
  SEBELUM baca DB; cabang anonim "limited identity" (nama/tgl-lahir utk WA tebakan) dihapus.
- `contexts/ingestion/service.ts` — `handleProcessUploadDoc`: kandidat hanya boleh ingest WA
  sendiri — cek payload `wa` sebelum download DAN cek `no_wa` hasil ekstraksi AI sebelum
  upsert master_database_candidate (menutup tulis lintas kandidat).
- `contexts/service-auth.test.ts` (baru) — 8 test regresi, semua rejection terjadi sebelum
  DB/network (jalan tanpa env).

## Verifikasi

- `npm run typecheck` (root, termasuk netlify/functions) — bersih
- Suite backend — **21 file / 202 test hijau** (+8 dari test baru)
- Tidak menyentuh indexer/frontend. `.netlify-built/*` (artefak build lama ter-commit) TIDAK
  dibangun ulang — deploy akan regenerate.

## Masih terbuka (bukan scope pass ini)

- C3 (audit endpoint publik PII tersisa), C6/upload URL allow-list, XSS S1/S4, S5 arbitrary
  URL, S11 API key di query string — catat di TODO/SECURITY_AUDIT sbg NOT FIXED.
- Prod: set SESSION_SECRET & SUPABASE_JWT_SECRET di dashboard Netlify; audit RLS produksi.

## Next setelah sesi ini

- Commit 5 file pass ini (`feat(backend): auth hardening ...`) atas izin; jangan push.
- Lanjut C3/C6 atau fitur HIGH lain (notifikasi WA admin, reminder jadwal) — lihat TODO.md.

---

# 🔄 HANDOVER Sesi 2026-09-04 (2) — C6: upload URL allow-list + https-only

**Branch:** `dev` · Sesi kedua hari yang sama, sesuai permintaan: "Close the remaining
C6/upload gap — storage-host allow-list + https-only di setiap URL dokumen yang diterima
di jalur documents/ingestion/storage, dengan regression tests."

## Perubahan (6 file, BELUM di-commit — menumpuk dengan pass auth C4/C5 di atas)

- `_lib/storage.ts` — S5 diangkat jadi C6: validator tunggal **`isAllowedDocumentUrl`**
  diekspor (https-only + host allow-list: `supabase.co` + subdomainnya, cloudinary,
  `storage.googleapis.com`; diperluas otomatis dengan host `SUPABASE_URL` custom domain dan
  env `ALLOWED_DOCUMENT_HOSTS` comma-separated untuk ops). `resolveFileUrl` (jalur
  master-data) memakainya; nilai placeholder `-` tetap lolos.
- `contexts/documents/service.ts` — helper `badDocumentUrls` + penegakan di 4 titik terima
  URL: `handleSubmitApply` (PAS_PHOTO/CV/JFT/SSW + extraFiles — sebelum lookup job/DB),
  `handleSimpanKandidatDanUpload` (admin, URL string langsung), `handleSimpanBerkasTahapan`
  (directUrl), `handleSimpanRevisiKandidat` (directUrl) — plus **guard IDOR** yang selama ini
  hilang: payload[0] = WA target, jadi kandidat hanya boleh revisi WA sendiri (pola sama dgn
  berkas-tahapan).
- `contexts/ingestion/service.ts` — cek skema longgar (`startsWith http`) diganti
  `isAllowedDocumentUrl` → SSRF ke host https arbitrer / jaringan internal tertutup.
- `contexts/documents/download.ts` — ZIP admin hanya me-fetch URL yang lolos allow-list;
  baris legacy di luar list di-skip seperti fetch gagal.
- Test: `_lib/storage.test.ts` (+5 unit validator), `contexts/service-auth.test.ts` (+5
  regresi DB-free: apply publik, berkas admin, revisi WA-scope + host, ingestion scheme &
  host). Semua rejection sebelum DB/network.

## Verifikasi

- `npm run typecheck` (root) — bersih
- Suite backend — **21 file / 212 test hijau** (+10 dari pass ini)
- CRLF file layanan dipertahankan (0 stray LF); tidak menyentuh indexer/frontend.

## Catatan

- `firebasestorage.googleapis.com` **tidak** lolos otomatis (bukan subdomain
  `storage.googleapis.com`). Kalau legacy masih menyimpan file di Firebase Storage, set
  `ALLOWED_DOCUMENT_HOSTS=firebasestorage.googleapis.com` di env.
- C3 (endpoint publik PII tersisa) tetap terbuka — tercatat NOT FIXED.
- Tree saat ini menumpuk **12 file** dua pass backend (C4/C5 + C6) + 3 dokumen yang memuat
  teks keduanya; belum ada commit backend sejak pivot dari indexer.

## Next setelah sesi ini

- Commit dua pass backend sebagai 1–2 commit (`feat(backend): auth hardening C4/C5` dan
  `feat(backend): C6 upload URL allow-list`) atas izin; jangan push.
- Lanjut C3 atau fitur HIGH lain (notifikasi WA/email, reminder jadwal) — lihat TODO.md.

---

# 🔄 HANDOVER Sesi 2026-09-04 (3) — Canonical pipeline reference in-repo

**Branch:** `dev` · Menindaklanjuti path eksternal yang dikirim user
(`~/.gemini/antigravity-ide/brain/<id>/ASTRO_PIPELINE_REFERENCE.md`): referensi migrasi
Legacy → Astro v2 (Surfaces/Contexts/Kernel, Preact islands, nanostores, apiClient).

## Aksi

- Salinan kanonik dibuat di **`docs/ASTRO_PIPELINE_REFERENCE.md`** (LF), dengan **banner
  status sync 2026-09-04** dan bagian Prioritas 1 diselaraskan ke keadaan kode: C4/C5/C6
  **SELESAI** (pass auth hardening + URL allow-list 2026-09-04), **C3 masih terbuka**
  (audit endpoint publik PII — `surfaces/public.ts`, `surfaces/docs.ts`, guard di
  `contexts/*/service.ts`).
- Semua path file yang dirujuk referensi (TabMail/TabJadwal/TabConfig/RirekishoBuilder,
  apiClient, surfaces mail/schedule/config/public/docs) terverifikasi ada.

## Catatan

- Docs-only change — tanpa typecheck/test (tidak menyentuh kode). Belum di-commit.
- Prioritas 2 (wiring Tab Mail/Jadwal/Config) dan Prioritas 3 (multi-template CV /
  RirekishoBuilder dinamis) tetap jadi kandidat kerja berikutnya dari referensi ini.

## Next setelah sesi ini

- Commit pass backend C4/C5 + C6 (12 file) + doc ini sebagai 2–3 commit atas izin.
- Kerjakan Prioritas 2 atau 3 dari referensi, atau C3 (audit endpoint publik).

---

# 🔄 HANDOVER Sesi 2026-09-04 (4) — C3 sweep: audit semua handle* + tutup 2 gap

**Branch:** `dev` · Sesuai permintaan: audit C3 — daftar setiap `handle*` yang diekspor di
`netlify/functions/contexts` yang membaca PII kandidat tanpa guard, fix yang terbuka, + test DB-free.

## Hasil audit (52 handler, 14 file service)

Semua handler sudah ber-guard KECUALI yang berikut (guard=0). Klasifikasi:

| Handler | Baca sensitif? | Verdict |
|---|---|---|
| `configuration.handleGetRincianPresets` | config admin (sys_config presets) | **DITUTUP: admin-only** (reachable via `config.js` tanpa auth) |
| `scheduling.handleCheckAndSendAgendaReminders` | daftar WA jadwal + token FCM + kirim push | **DITUTUP: admin-only** (reachable via `schedule.js`; tidak ada caller non-admin sah; cron Netlify = `sweep-queue`, bukan surface ini) |
| `catalog.handleShareData` | roster kandidat + URL dokumen per job | Publik by-design (viewer TSK) TAPI **belum ter-wire** di pipeline modern: `surfaces/docs.ts` tidak memetakan action `shareData`, endpoint GET `share-data` = NOT_IMPLEMENTED, tanpa caller client → **tidak live**. Wajib di-gate per-job token saat `share.astro` di-wire (follow-up) |
| `diagnostics.handleReportWebVital` | tidak ada (telemetri) | publik OK |
| `registration.handleSubmitDaftarSiswa`, `handleGetLinkSiswaBaru`, `handleGenerateFormBridge`, `documents.handleSubmitApply` | write/link publik self-service | publik by-design OK |
| 40+ handler lain | — | semua ber-guard (requireAdmin/requireRole/verifyToken/isOwnerOrAdmin), diverifikasi mekanis per handler |

## Perubahan (5 file, BELUM di-commit)

- `contexts/configuration/service.ts` — `handleGetRincianPresets(sessionToken?)` + guard admin.
- `surfaces/config.ts` — teruskan sessionToken ke action `getRincianPresets`.
- `contexts/scheduling/service.ts` — `handleCheckAndSendAgendaReminders(sessionToken?)` + guard
  admin (catatan: cron masa depan harus panggil context langsung, bukan lewat HTTP surface).
- `surfaces/schedule.ts` — teruskan sessionToken ke action `checkAndSendAgendaReminders`.
- `contexts/service-c3.test.ts` (baru) — 4 test DB-free (anon + kandidat ditolak sebelum DB/network).

## Verifikasi

- `npm run typecheck` (root) — bersih
- Suite backend — **23 file / 216 test hijau** (+4 dari test baru)
- EOL konsisten (config/scheduling CRLF, schedule.ts/service-c3 LF)

## Catatan

- Prioritas 1 (C3–C6) di referensi pipeline kini **SELESAI penuh**; sisa item keamanan =
  gate wiring share view dengan per-job token saat diimplementasi (TODO.md).
- Tree menumpuk 6 file pass ini (5 code/test + docs yang akan datang di commit).

## Next setelah sesi ini

- Commit C3 sweep (`feat(backend): C3 sweep ...`) atas izin; jangan push.
- Lanjut Prioritas 2 (Tab Mail/Jadwal/Config wiring) atau fitur HIGH lain — lihat referensi.

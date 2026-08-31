# ASTRO_HANDOVER.md — Handover Lengkap: Astro Migration

> **Tujuan:** Dokumen ini agar AI coding di kantor bisa langsung lanjut tanpa bertanya.
> **Terakhir update:** 2026-08-31
> **Commit terakhir:** af91ca7

---

## 1. STATUS MIGRASI

### Sudah Selesai

| Halaman | URL | Status | Match Legacy |
|---------|-----|--------|-------------|
| Public (landing) | `/` | Full | 95% |
| Public (alternate) | `/public` | Full | 95% |
| Admin | `/admin` | Full (8 tabs) | 90% |
| Candidate | `/candidate` | Full | 85% |
| Siswa Baru | `/siswa-baru` | Full | 90% |
| AI CV | `/ai-cv` | Full | 90% |
| Apply | `/apply` | Full | 90% |
| Master | `/master` | Full | 90% |
| Share | `/share` | Full | 90% |

### Belum Fix / Partial

| Item | Status | Priority |
|------|--------|----------|
| Admin modal actions (CV Mini save, E-Sign submit) | Belum wired | HIGH |
| Candidate document upload flow | Belum migrate | HIGH |
| AI Copilot functional | Belum migrate | MEDIUM |
| Email notifications | Belum migrate | MEDIUM |
| __H error di dev mode (Vite) | Dev-only, production OK | LOW |

---

## 2. ARSITEKTUR

### Stack
Astro (SSG mode) + Preact (client islands) + Tailwind v4 + Nanostores + Vite

### MODE SUDAH SSG (STATIC)
- `output: 'server'` DIKOMENTARI di astro.config.mjs
- Semua halaman di-build jadi HTML statis
- API calls dari component Preact via Vite proxy ke asjportal.netlify.app

### Cara Kerja API
Browser -> Astro page -> fetch('/.netlify/functions/xxx') -> Vite proxy -> asjportal.netlify.app

---

## 3. CARA JALAN

### Development
```bash
cd C:/asj-astro
npx astro dev --host 0.0.0.0 --port 4321
# Buka http://localhost:4321
```

### Production Preview
```bash
npx astro build
node server.cjs
# Buka http://localhost:4321
```

---

## 4. KNOWN ISSUES

### __H Error (Dev Mode Only)
Vite split Preact + nanostores ke chunk berbeda -> 2 instance hooks.
Sudah di-fix di astro.config.mjs (resolve.dedupe + optimizeDeps.include).
Kalau masih terjadi: hapus node_modules/.vite + .astro, restart.
Production build: TIDAK ada error ini.

### Tab Data Kosong (TabPelamar/TabMail)
Backend butuh sessionToken untuk return data admin.
Sudah di-fix: semua tab fetch calls include sessionToken.
Tanpa login admin, data memang kosong (expected).

### Deploy Gagal (Env Vars > 4KB)
Firebase service account JSON (~1.7KB) + semua env vars > 4KB Lambda limit.
Solusi: hapus FIREBASE_SERVICE_ACCOUNT dari Netlify env vars.

---

## 5. AUTH FLOW

### Admin Login (3-step)
1. Buka /admin
2. Enter master PIN: 123456
3. Select admin (KHOCI)
4. Enter personal PIN: 4444

### Kandidat Login
WA: 082130442661
Password: 2661

### Session Storage
localStorage key: 'asj_auth'
{ role, name, wa, sessionToken, refreshToken, isLoggedIn, lastChecked }

---

## 6. I18N

### Cara Kerja
- Preact components: t('key') -> auto-update on toggle
- Astro static HTML: data-lang="key" -> translateDataLang()
- Language: localStorage.asj_lang ("id" atau "jp")
- File: src/store/i18n.ts (400+ keys)

### Menambah Key
Tambah di src/store/i18n.ts -> export const LANG = { id: {...}, jp: {...} }
Di component: import { t } from '../store/i18n'; t('ui.new_key')

---

## 7. DEPENDENCY VERSIONS (LOCKED)

```
preact: 10.24.3
nanostores: 0.11.0
@nanostores/preact: 0.5.0
@astrojs/preact: 4.0.0
astro: 5.12.0
```

JANGAN upgrade tanpa test.

---

## 8. FILE STRUCTURE

```
src/pages/          # 9 Astro pages
src/components/     # Preact components (TSX)
src/store/          # Nanostores (i18n, auth, admin, user)
src/lib/            # Supabase client, API bridge, CV helpers
src/layouts/        # BaseLayout.astro
public/assets/      # Images (banners, footers, logos)
netlify/functions/   # Legacy backend (proxy target)
astro.config.mjs    # Astro + Vite config
server.cjs          # Local preview server
package.json        # Dependencies (PINNED)
```

---

## 9. GIT COMMANDS

### Push ke GitHub
```bash
# Token perlu di-set ulang kalau expired
git remote set-url origin https://khoci280-arch:TOKEN@github.com/khoci280-arch/asj-astro.git
git push origin main
git remote set-url origin https://github.com/khoci280-arch/asj-astro.git
```

### Recent Commits
```
af91ca7 fix(deps): pin exact versions
af601ca fix(admin): add sessionToken to all tab fetch + fix i18n imports
8ecffe9 fix(header): restore toggleTheme + HEADER_BGS
fad2530 fix(modals+bg): fix 4 candidate modals + backgrounds
```

---

## 10. PERINTAH UNTAI AI CODING

### Kalau diminta "lanjut migrasi"
1. Baca ASTRO_HANDOVER.md ini
2. Baca AGENTS.md untuk skill dispatch
3. Cek src/components/ mana yang belum lengkap
4. JANGAN push ke Netlify tanpa izin

### Kalau diminta "fix bug"
1. Cek console.log di browser
2. Cek __H error -> clear cache kalau ada
3. Cek network tab -> API call berhasil?
4. Cek auth state -> localStorage.getItem('asj_auth')

### Kalau diminta "deploy"
1. JANGAN deploy tanpa izin pemilik
2. Pastikan env vars < 4KB
3. Pastikan npx astro build clean
4. Push ke GitHub dulu (backup)
5. Baru deploy Netlify

# 📊 Referensi Responsiveness: Modal Legacy (live) ↔ Astro v2

> **Dibuat:** 2026-09-05 · **Sumber legacy:** `E:\Asjpow4v7-main\khoci921` (deploy live: `asjportal.netlify.app`).
> **Cara ukur:** legacy disajikan lokal (static + proxy `/.netlify/functions` → backend live) lalu di-klik
> lewat preview tool dengan polling 8ms; angka = ms dari klik sampai elemen modal terlihat (offsetWidth /
> getClientRects > 0) berisi konten. Semua angka diambil di mesin yang sama dengan pengukuran astro, jadi
> relatifnya valid. Hanya membuka + menutup modal — **tidak ada aksi yang mengubah data**.

## Ringkasan temuan

1. **Legacy = HTML monolitik**: SEMUA modal sudah dirender di DOM sejak awal (hidden), klik hanya
   toggle `display`. Karena itu hampir semua buka/tutup modal legacy terukur **≤ ~30ms** — mulus.
2. **Astro setara untuk yang sudah diporting**: modal DETAIL loker & pamflet terbuka dari data klien,
   juga instan (lihat tabel). Bug yang sempat membuat astro terasa lemot ada di dua tempat dan sudah
   diperbaiki (2026-09-05): pamflet spinner tak pernah berhenti pada gambar cache, dan toggle JP yang
   tidak pernah berganti bahasa di switch pertama (race dict async). Detail di `PARITY_CHECKLIST.md`.
3. **Latensi dominan bukan UI**: request data (mis. `get-app-data`, list kandidat) memanggil Netlify
   Functions produksi yang sama (±0.9–2 dtk di jaringan ukur; cold start bisa lebih lama). Legacy dan
   astro sama-sama menunggu ini — perbedaannya hanya di apa yang dirender selama menunggu.
4. **Toggle bahasa legacy ≠ astro (cakupan, bukan kecepatan)**: legacy menulis-ulang SELURUH DOM
   (termasuk panel admin tersembunyi + kolom data loker/gender/lokasi) ~185ms; astro me-render ulang
   UI yang terlihat 17–18ms tapi belum menerjemahkan kolom data dari backend (gap parity terjemahan).

## Tabel ukur terpilih (2026-09-05, profil sama, backend live sama)

| # | Aksi / Modal legacy (trigger → file) | Buka | Tutup | Perilaku | Padanan Astro (komponen) |
|---|---|---|---|---|---|
| B-* | **Pamflet zoom** (`bukaPamflet`, `js/08_wa_pintar.ts`) | **28ms** | — | Gambar tampil langsung, TANPA spinner; thumbnail cache hangat | `PamfletModal.tsx` — dulu spinner abadi pd gambar cache, sekarang reconcile `img.complete` + `onError` (≈1 frame) |
| B-* | **Detail loker** (`bukaDetailLoker`, `js/01_public.ts`) | **19ms** | instan | Konten lengkap dari data klien (Total Biaya, tahapan, include/exclude) — tidak ada fetch | `LokerDetailModal.tsx` (instan, data klien) |
| B01 | **Login/Daftar kandidat** (`prosesLoginKandidat`, `js/04_auth.ts`) | **~13–19ms** | instan | Satu modal berisi panel Daftar + Login (tab-switch), pre-rendered | `LoginModal.tsx` (mode login/daftar) |
| — | **Toggle bahasa ID↔JP** (`i18n` + `assets/jp-locale.js`) | **~185ms** (dua arah) | — | Terjemahan DOM penuh (termasuk bagian tersembunyi + data baris) | App toggle — 17–18ms UI publik; cakupan data kolom belum parity |
| A17 | **Edit Loker Full** (baris aksi admin) | **29ms** | **20ms** | Modal lengkap: KODE JOB readonly, kategori, syarat, upload, rincian | `AdminJobEditModal.tsx` |
| — | **Alur LAMAR** (`apply-full.html`) | DOMContentLoaded **310ms** | — | 14 field langsung siap; panggilan prefill baru saat WA diisi | `ApplyFullForm.tsx` (`/apply`) |

Catatan ukur: modal admin lain (CV preview kandidat, matchmaking, mail, WA template, share, dll) ada di
belakang tab Data Pelamar/Mail/WA yang di legacy berat saat masuk section (main thread sibuk beberapa
detik) — tidak diukur tuntas di sesi ini; daftar lengkap + status parity ada di `PARITY_CHECKLIST.md`
(baris A01–A19, B01–B02, C01–C05) dengan komponen astro masing-masing.

## Cara mengukur ulang

```bash
# Legacy (dari repo astro; server utilitas di .freebuff — gitignored)
node .freebuff/legacy-serve.mjs          # http://127.0.0.1:4521  (root E:\Asjpow4v7-main\khoci921,
                                         # proxy /.netlify/functions -> asjportal.netlify.app live)

# Astro
npm run dev                              # http://127.0.0.1:4321 (proxy fungsi yang sama)
```

Ukur: klik trigger → polling 8ms sampai konten modal terlihat; bandingkan ms + ada/tidaknya spinner
kosong. Untuk tampilan publik murni legacy, pakai private window (profil preview ini menyimpan sesi
admin `KHOCI` di localStorage: `asj_admin_login=sukses`).

## Batasan sesi ukur ini

- Hanya aksi **open/close** yang dieksekusi; tidak ada submit/kirim/hapus → angka submit belum diukur.
- Modal butuh data/akun khusus (kirim undangan grup, esign/naitei, share TSK) hanya dicatat mapping-nya.
- Alur LAMAR penuh (upload file → cloudinary → submit) butuh berkas sungguhan — baru diukur sampai
  form siap (310ms) + fetch prefill saat WA diisi.

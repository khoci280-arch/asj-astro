# Audit Performa Database — ASJ Portal v2 (TERUKUR)

**Tanggal:** 2026-09-01
**Sumber data:** pengukuran langsung ke produksi (PostgreSQL 17.6, Supabase ap-southeast-1) + penelusuran kode
**Status:** revisi penuh — menggantikan draf sebelumnya yang berbasis perkiraan

---

## Ringkasan Eksekutif

**Databasenya bukan masalah. Jaringannya yang masalah.**

Saya mengukur setiap pola query yang dipakai aplikasi. Semuanya selesai **di bawah 2 milidetik**. Waktu eksekusi SQL paling lambat yang saya temukan adalah 1,8 ms. Sementara satu round-trip jaringan ke Supabase memakan **39 ms median**.

Artinya: untuk mengambil 225 kandidat, **99,7% waktunya dihabiskan di jaringan**, 0,3% di database.

| Metrik | Terukur |
|---|---|
| Total ukuran database | **14 MB** |
| `database_candidate` | **225 baris** (33 kolom, 655 B/baris) |
| `master_database_candidate` | **230 baris** (**169 kolom**, 1.140 B/baris) |
| `database_asj_form` | **20 baris** |
| Query terlambat yang ditemukan | **1,8 ms** |
| Round-trip jaringan (median) | **39,2 ms** (p95 69,2 ms) |
| Ambil 225 kandidat, ujung ke ujung | **57,4 ms** → 99,7% jaringan |
| Cache hit ratio | **100%** |
| Dead tuples | **0** di semua tabel |

Pada skala ini, **menambah index tidak akan membantu apa-apa** — PostgreSQL dengan tepat memilih seq scan karena membaca 225 baris (18 buffer) lebih murah daripada traversal index. Dan ternyata sudah ada **20 index yang tidak pernah dipakai**.

Yang benar-benar memperlambat adalah **jumlah round-trip HTTP per permintaan**, diperburuk oleh pola kode yang menembak query ke kolom yang **tidak ada di skema**.

---

## Koreksi terhadap Draf Sebelumnya

Draf pertama saya menulis analisis dari penelusuran kode saja. Setelah terhubung ke produksi, **empat dari sepuluh temuan saya terbukti salah**. Saya sebutkan terus terang karena rekomendasinya ikut berubah:

| Dugaan sebelumnya | Hasil pengukuran | Status |
|---|---|---|
| `findTable()` menebak 4–9 nama tabel per request | Nama pertama selalu benar (`database_candidate`, `job_database`, `sys_config`) → **1 panggilan** | ❌ Salah |
| `fetchPagedAll` mem-paginate 5 halaman serial | 225 baris < 1000 → **1 halaman** (+1 panggilan kosong) | ❌ Salah |
| Nomor WA tersimpan dalam format campur aduk | **100% sudah `628…`**, tidak satu pun mengandung non-digit | ❌ Salah |
| Migrasi `2026-08-16` tidak pernah dijalankan | **Sudah diterapkan lengkap** — semua 6 index-nya ada | ❌ Salah |
| `id_loker_pilihan` berisi banyak kode job (CSV) | **0 dari 225 baris** mengandung koma | ❌ Salah (risiko laten saja) |
| Tabel master 154 kolom | **169 kolom**, 1.140 B/baris | ✅ Benar (lebih buruk) |
| Tidak ada keep-alive / timeout di transport | Terkonfirmasi dari kode | ✅ Benar |
| N+1 dan round-trip serial | Terkonfirmasi dari kode | ✅ Benar |
| Cache ber-TTL pendek, dibatalkan global | Terkonfirmasi dari kode | ✅ Benar |

**Konsekuensinya:** rekomendasi `wa_norm` (kolom generated untuk normalisasi WA), matview `mv_candidate_current`, dan tabel penghubung `candidate_jobs` **semuanya saya tarik** — tidak ada masalah yang mereka pecahkan pada data ini.

---

## Akar Masalah yang Sebenarnya

### 1. Query ke kolom yang tidak ada (pemborosan paling nyata)

Kode mencoba 7 alias untuk kolom nomor WA: `no_wa`, `wa`, `whatsapp`, `telepon`, `phone`, `no_hp`, `telp`.

Skema produksi hanya punya **satu**: `no_wa`. Enam sisanya **tidak ada di tabel mana pun**.

```
Kolom WA yang TERSEDIA vs yang DITEBAK kode:
  kode mencoba : no_wa, wa, whatsapp, telepon, phone, no_hp, telp
  database_candidate        ada: no_wa     TIDAK ADA: wa, whatsapp, telepon, phone, no_hp, telp
  master_database_candidate ada: no_wa     TIDAK ADA: wa, whatsapp, telepon, phone, no_hp, telp
  database_asj_form         ada: no_wa     TIDAK ADA: wa, whatsapp, telepon, phone, no_hp, telp
```

Dampak konkrit pada `fetchMasterLightByWa` (`db/master.ts:43-68`):

```ts
const tryQuery = async (query) => {
  try { light = await select(MASTER_LIGHT_COLS, query) } catch { /* gagal */ }
  try { full  = await select('*', query) }               catch { /* gagal */ }
  return null;
};
const r1 = await tryQuery({ or: '(no_wa.in.(…),wa.in.(…),whatsapp.in.(…))' });  // ← GAGAL
if (r1 !== null) return r1;
return tryQuery({ no_wa: 'in.(…)' });                                          // ← baru berhasil
```

Percobaan pertama memakai `or=` yang menyebut kolom `wa` dan `whatsapp` → PostgREST menolak → **dua panggilan HTTP gagal** (light, lalu full), barulah percobaan kedua berhasil.

**Setiap lookup master membayar 3 round-trip untuk 1 query yang berguna.** Dengan RTT 39 ms, itu ~78 ms terbuang per lookup — **54× lipat** dari waktu eksekusi query itu sendiri (1,5 ms).

Pola yang sama ada di:
- `db/candidates.ts:148-172` `findCandidateByWaFiltered` — 3 query paralel, 2 di antaranya pasti gagal
- `db/forms.ts:85-110` `findFormsByWa` — `or=(no_wa.eq.X,wa.eq.X)` gagal, lalu fallback
- `db/forms.ts:156-182` `findFormsByWaList` — sampai 4 percobaan

### 2. Dedupe untuk data yang unik

`dedupeKandidatRaw` (`actions-public.ts:137-160`) menyatukan baris dengan nomor WA sama. Tapi:

```
9. DUPLIKASI BARIS PER WA
database_candidate.no_wa            0 WA duplikat
master_database_candidate.no_wa     0 WA duplikat
database_asj_form.no_wa             0 WA duplikat
```

`no_wa` memiliki constraint UNIQUE (`idx_cand_no_wa_uniq`) di `database_candidate`. **Duplikasi secara fisik tidak mungkin terjadi.** Fungsi ini melakukan kerja O(N) pada setiap permintaan yang tidak akan pernah menemukan apa pun — murni warisan dari era data lama.

### 3. Index berlebih, bukan kekurangan index

20 index tidak pernah dipakai sekali pun, dan terdeteksi **20 pasang index redundan**:

```
[master_database_candidate] IDENTIK
   idx_master_no_wa
   master_database_candidate_no_wa_key (UNIQUE)   <- bisa di-drop
   idx_master_no_wa_uniq (UNIQUE)                 <- bisa di-drop

[job_database] IDENTIK
   idx_job_code
   job_database_pkey (UNIQUE)
   uq_job_code_job (UNIQUE)          <- 3 index identik pada kolom yang sama

[database_candidate] IDENTIK
   idx_cand_loker
   idx_candidate_id_loker
   idx_cand_loker_trgm               <- 3 index pada id_loker_pilihan
```

Pada `database_candidate`, **ukuran index (0,2 MB) dua kali lipat ukuran datanya (0,1 MB)** — untuk tabel 225 baris. Setiap index juga memperlambat `INSERT`/`UPDATE`.

Paradoksnya: migrasi `2026-08-16` yang "diperbaiki" justru menambah index yang tidak pernah dipakai (`idx_cand_loker_trgm`, `idx_berkas_wa`, `idx_asj_form_no_wa` — semuanya 0 scan).

### 4. Tidak ada keep-alive, tidak ada timeout

`db/client.ts:40` dan `:114` memakai `fetch()` polos. Setiap panggilan membuka koneksi TLS baru. Tidak ada `AbortSignal.timeout` — tidak seperti jalur Gemini (`actions-ingest.ts:109`) dan download (`actions-download.ts:27`) yang sudah punya. Satu panggilan Supabase yang menggantung akan menghabiskan seluruh budget 10 detik Netlify Function.

---

## Rekomendasi Berprioritas (berbasis pengukuran)

Perkiraan gain dihitung dari RTT median terukur **39,2 ms**.

### P0 — Hapus round-trip yang sia-sia (tanpa sentuh database)

Semua perubahan kode, risiko rendah, hasil langsung terasa.

| # | Aksi | Lokasi | Gain terukur |
|---|---|---|---|
| **P0-1** | **Hapus alias kolom WA yang tidak ada.** Ganti `or=(no_wa.…,wa.…,whatsapp.…)` menjadi `no_wa=in.(…)` langsung. | `db/master.ts:14-68`, `db/candidates.ts:148`, `db/forms.ts:85,156` | **−2 round-trip per lookup** ≈ −78 ms per lookup master; −78 ms per lookup kandidat |
| **P0-2** | **Hapus `dedupeKandidatRaw`.** Constraint UNIQUE menjamin tidak ada duplikat. | `actions-public.ts:137-160` | Menghapus O(N) pemrosesan JS yang selalu no-op |
| **P0-3** | **Hentikan `fetchPagedAll` setelah halaman penuh pertama** bila `rows.length < pageSize`. Sekarang selalu menembak 1 halaman ekstra yang kosong. | `db/candidates.ts:89-102` | −1 round-trip per muat daftar ≈ −39 ms |
| **P0-4** | **Aktifkan keep-alive + timeout** pada transport PostgREST. | `db/client.ts:40,114` | Menghilangkan handshake TLS per panggilan; mencegah hang 10 s |

Contoh P0-4:

```ts
// db/http.ts
import { Agent } from 'undici';
export const supabaseAgent = new Agent({
  connections: 8, keepAliveTimeout: 30_000,
  connectTimeout: 5_000, bodyTimeout: 8_000, headersTimeout: 5_000,
});
export const DB_TIMEOUT_MS = 8_000;
```

```ts
const res = await fetch(url, {
  method, headers, body,
  dispatcher: supabaseAgent,
  signal: AbortSignal.timeout(DB_TIMEOUT_MS),
});
```

**Total P0: ~4 round-trip dihilangkan per permintaan** ≈ **−160 ms pada RTT saat ini**, dan proporsional lebih besar bila Netlify berada di region yang lebih jauh.

### P1 — Kurangi ukuran payload

| # | Aksi | Lokasi | Gain |
|---|---|---|---|
| **P1-1** | **Wajibkan proyeksi di jalur master.** Tabel 169 kolom / 1.140 B per baris; jalur fallback masih `select=*`. | `db/berkas.ts:103-111`, `db/master.ts:14-37` | ~1,1 KB → ~0,3 KB per baris |
| **P1-2** | **Naikkan TTL cache data publik** dari 20 dtk ke 5 menit, ganti `cacheClear()` global dengan invalidasi per-kunci. | `cache.ts`, `actions-public.ts:240` | Menurunkan beban puncak; data publik (jobs/assets/dropdown) nyaris statis |

### P2 — Bersih-bersih index (satu-satunya perubahan DB yang saya sarankan)

Berdasarkan 20 pasang redundan terdeteksi. Lihat `netlify/migrations/2026-09-01-drop-redundant-indexes.sql`.

**Harapan yang realistis:** ini **tidak akan mempercepat pembacaan** — query sudah berjalan < 2 ms dan planner memilih seq scan dengan tepat. Manfaatnya ada di (a) mengurangi biaya tulis, (b) mengecilkan ukuran database, (c) mengurangi kebingungan saat audit berikutnya. Jangan mengharapkan peningkatan latensi dari sini.

### P3 — Tidak perlu dilakukan

Berdasarkan pengukuran, **jangan** lakukan hal-hal ini:

| Jangan | Alasan |
|---|---|
| Tambah index baru | Query sudah < 2 ms; 20 index existing saja tidak kepakai |
| Materialized view untuk dedupe | 225 baris; dedupe di JS memakan waktu yang tak terukur |
| Kolom `wa_norm` / fungsi `normalize_wa` | Data sudah 100% ternormalisasi (`628…`), 0 non-digit |
| Tabel penghubung `candidate_jobs` | 0 dari 225 baris berisi multi-job |
| Autovacuum agresif / `ANALYZE` | 0 dead tuple, cache hit 100% |
| Tuning `work_mem` / `shared_buffers` | Seluruh database 14 MB — muat di cache |

---

## Rencana Eksekusi

1. **P0-1 dulu** — hapus alias kolom WA yang tidak ada. Ini satu-satunya perubahan dengan dampak terbesar dan risiko terendah. Ukur sebelum/sesudah.
2. **P0-4** — keep-alive + timeout. Perubahan mandiri di satu berkas.
3. **P0-2, P0-3** — hapus dedupe yang tidak perlu dan halaman ekstra.
4. **P1-1** — proyeksi di jalur master.
5. **P2** — drop index redundan (hati-hati: pastikan tidak ada yang dipakai RLS policy).
6. Ulangi `scripts/db-baseline.mjs` untuk membandingkan.

---

## Yang Belum Saya Ukur

Dua hal yang memerlukan akses yang belum Anda berikan:

1. **RTT dari Netlify ke Supabase.** Angka 39,2 ms di atas diukur dari mesin Anda. Kalau function Netlify Anda berjalan di region berbeda, RTT-nya bisa 2–5× lebih besar — yang akan membuat rekomendasi P0 **jauh lebih bernilai** lagi. Cara mengukur: tambahkan pencatatan waktu di `db/client.ts` dan lihat log function.
2. **Rasio hit cache `getAppData`.** Menentukan seberapa sering biaya penuh benar-benar dibayar.

Keduanya tidak mengubah prioritas di atas — hanya besaran gain-nya.

---

## Berkas Terkait

| Berkas | Isi |
|---|---|
| `scripts/db-baseline.mjs` | Pengukuran ulang, 17 section, **hanya baca**. `DATABASE_URL=… node scripts/db-baseline.mjs` |
| `netlify/migrations/2026-09-01-drop-redundant-indexes.sql` | Drop index redundan (P2), dengan verifikasi |
| `netlify/migrations/2026-09-01-perf-remediation.sql` | **DITARIK** — rekomendasi di dalamnya (wa_norm, matview, candidate_jobs) tidak relevan setelah pengukuran |

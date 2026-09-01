-- =============================================================================
-- 2026-09-01 — Pembersihan index redundan (Supabase / PostgreSQL 17.6)
-- -----------------------------------------------------------------------------
-- Latar belakang TERUKUR (bukan perkiraan):
--   * Total database hanya 14 MB; database_candidate 225 baris.
--   * SEMUA pola query aplikasi berjalan < 2 ms (paling lambat 1,8 ms).
--   * Cache hit 100%, 0 dead tuple.
--   * 20 index tidak pernah di-scan; 20 pasang index redundan terdeteksi.
--   * Pada database_candidate, ukuran index (0,2 MB) = 2x ukuran data (0,1 MB).
--
-- APA YANG DIHARAPKAN:
--   JANGAN berharap pembacaan jadi lebih cepat. Query sudah < 2 ms dan planner
--   dengan tepat memilih seq scan pada tabel sekecil ini. Manfaat yang nyata:
--     (a) INSERT/UPDATE lebih murah (setiap index harus dipelihara saat tulis)
--     (b) database lebih kecil
--     (c) audit berikutnya tidak bingung melihat 3 index identik
--
-- PERINGATAN SEBELUM MENJALANKAN:
--   1. Jalankan SECTION 1 dulu. Kalau ada policy RLS yang memakai index ini,
--      JANGAN lanjut — urus policy-nya lebih dulu.
--   2. Constraint UNIQUE yang menahan invariant aplikasi TIDAK di-drop.
--      Yang di-drop hanya duplikatnya. Uniqueness tetap terjaga.
--   3. Semua DROP memakai IF EXISTS -> aman dijalankan ulang.
--   4. DROP INDEX di PostgreSQL tidak mengunci tabel lama (hanya sekejap).
--      Tetapi tetap jalankan di luar jam sibuk untuk amannya.
--
-- HASIL PEMERIKSAAN KEAMANAN (sudah dijalankan 2026-09-01 terhadap produksi):
--   * Policy RLS: hanya 1, yaitu "Service role full access" pada fcm_tokens.
--     Tidak ada tabel target yang punya policy -> AMAN.
--   * Index terikat constraint: 0. Semua 13 target adalah index biasa hasil
--     CREATE INDEX, jadi DROP INDEX langsung sah dan tidak akan menjatuhkan
--     constraint apa pun.
--   * Dua index tercatat pernah di-scan: uq_job_code_job (2) dan
--     idx_master_no_wa_uniq (1). Keduanya duplikat dari index yang DIPERTA-
--     HANKAN (job_database_pkey dan master_database_candidate_no_wa_key),
--     jadi setelah di-drop query-nya otomatis dialihkan ke yang tersisa.
--   * Constraint yang dipertahankan: 28 (terdiri dari 19 PRIMARY KEY + 9 UNIQUE),
--     termasuk database_asj_form_no_wa_code_job_key yang dipakai jalur upsert
--     di db/forms.ts:118 dan master_database_candidate_no_wa_key.
-- =============================================================================


-- =============================================================================
-- SECTION 1 — PEMERIKSAAN WAJIB (jalankan DULU)
-- =============================================================================

-- 1.1  Apakah ada policy RLS yang bergantung pada index yang akan di-drop?
--      Kalau kueri ini mengembalikan baris, JANGAN lanjut sebelum reviewed.
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('database_candidate','master_database_candidate',
                    'database_asj_form','job_database','pemberkasan_checklist',
                    'ai_form_submissions');

-- 1.2  Index yang akan di-drop, beserta berapa kali pernah dipakai.
--      Kalau ada yang idx_scan-nya TINGGI, jangan drop index itu.
SELECT s.schemaname, s.relname AS tabel, s.indexrelname AS index,
       s.idx_scan, pg_size_pretty(pg_relation_size(s.indexrelid)) AS ukuran
FROM pg_stat_user_indexes s
WHERE s.schemaname = 'public'
  AND s.indexrelname IN (
    'idx_master_no_wa','idx_master_no_wa_uniq','idx_master_id_kandidat',
    'idx_job_code','uq_job_code_job',
    'idx_cand_id_kandidat','idx_dc_no_wa_loker',
    'idx_cand_loker','idx_cand_loker_trgm',
    'idx_asj_form_no_wa','idx_form_wa_job',
    'idx_berkas_wa','idx_ai_sub_wa'
  )
ORDER BY s.idx_scan DESC, pg_relation_size(s.indexrelid) DESC;

-- 1.3  Constraint yang DIPERTAHANKAN (penjamin keunikan data).
--      Pastikan semua masih ada SETELAH SECTION 2 dijalankan.
SELECT conrelid::regclass AS tabel, conname,
       pg_get_constraintdef(oid) AS definisi
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype IN ('p','u')
  AND conrelid::regclass::text IN (
    'database_candidate','master_database_candidate','database_asj_form',
    'job_database','pemberkasan_checklist','ai_form_submissions')
ORDER BY 1, 2;


-- =============================================================================
-- SECTION 2 — DROP INDEX REDUNDAN
-- -----------------------------------------------------------------------------
-- Format: [PERTahankan] vs [DROP]
-- Uniqueness tidak hilang: yang di-drop selalu yang NON-constraint, sementara
-- constraint UNIQUE / PRIMARY KEY yang setara tetap dipertahankan.
-- =============================================================================

-- ---- 2.1  master_database_candidate: TIGA index identik pada no_wa ----
--   PERTahankan : master_database_candidate_no_wa_key  (UNIQUE, constraint)
--   DROP        : idx_master_no_wa                     (identik, non-constraint)
--   DROP        : idx_master_no_wa_uniq                (identik, non-constraint)
DROP INDEX IF EXISTS idx_master_no_wa;
DROP INDEX IF EXISTS idx_master_no_wa_uniq;

-- ---- 2.2  master_database_candidate: DUA index identik pada id_kandidat ----
--   PERTahankan : uq_master_id_kandidat   (UNIQUE)
--   DROP        : idx_master_id_kandidat  (identik, non-unique)
DROP INDEX IF EXISTS idx_master_id_kandidat;

-- ---- 2.3  job_database: TIGA index identik pada code_job ----
--   PERTahankan : job_database_pkey  (PRIMARY KEY — JANGAN PERNAH DI-DROP)
--   DROP        : idx_job_code       (identik)
--   DROP        : uq_job_code_job    (identik)
DROP INDEX IF EXISTS idx_job_code;
DROP INDEX IF EXISTS uq_job_code_job;

-- ---- 2.4  database_candidate: id_kandidat adalah prefix unique_candidate_loker ----
--   PERTahankan : unique_candidate_loker (id_kandidat, id_loker_pilihan) — UNIQUE
--                 index ini sudah melayani pencarian id_kandidat saja (prefix btree)
--   DROP        : idx_cand_id_kandidat   (prefix, redundan)
DROP INDEX IF EXISTS idx_cand_id_kandidat;

-- ---- 2.5  database_candidate: no_wa adalah prefix idx_dc_no_wa_loker ----
--   PERTahankan : idx_cand_no_wa_uniq  (no_wa) — UNIQUE, dipakai Q3 (index scan)
--   DROP        : idx_dc_no_wa_loker   (no_wa, id_loker_pilihan) — prefix redundan
DROP INDEX IF EXISTS idx_dc_no_wa_loker;

-- ---- 2.6  database_candidate: TIGA index pada id_loker_pilihan ----
--   PERTahankan : idx_candidate_id_loker  (btree)
--   DROP        : idx_cand_loker          (identik)
--   DROP        : idx_cand_loker_trgm     (GIN trgm)
--
--   Catatan idx_cand_loker_trgm: dibuat migrasi 2026-08-16 untuk melayani
--   ILIKE '%kode%'. Terukur TIDAK pernah dipakai (0 scan) — pada 225 baris
--   dengan pola yang cocok 56% baris, seq scan selalu lebih murah.
--   Kolom ini juga terbukti TIDAK pernah berisi multi-value (0 dari 225 baris
--   mengandung koma), jadi manfaat trigram-nya nol.
DROP INDEX IF EXISTS idx_cand_loker;
DROP INDEX IF EXISTS idx_cand_loker_trgm;

-- ---- 2.7  database_asj_form: (no_wa, code_job) ganda ----
--   PERTahankan : database_asj_form_no_wa_code_job_key (UNIQUE, constraint)
--                 -> ini yang dipakai jalur upsert di db/forms.ts:118
--   DROP        : idx_form_wa_job    (identik)
--   DROP        : idx_asj_form_no_wa (prefix dari constraint di atas)
DROP INDEX IF EXISTS idx_form_wa_job;
DROP INDEX IF EXISTS idx_asj_form_no_wa;

-- ---- 2.8  pemberkasan_checklist: wa adalah prefix (wa, tahap) ----
--   PERTahankan : idx_pemberkasan_wa_tahap (UNIQUE)
--   DROP        : idx_berkas_wa            (prefix, dibuat migrasi 2026-08-16, 0 scan)
DROP INDEX IF EXISTS idx_berkas_wa;

-- ---- 2.9  ai_form_submissions: wa adalah prefix (wa, created) ----
--   PERTahankan : idx_ai_wa_created
--   DROP        : idx_ai_sub_wa
DROP INDEX IF EXISTS idx_ai_sub_wa;


-- =============================================================================
-- SECTION 3 — OPSIONAL (pertimbangkan dulu, jangan asal jalankan)
-- =============================================================================

-- Index berikut tercatat 0 scan, tapi melayani pola ORDER BY yang nyata.
-- Pada 225 baris nilainya nol; kalau tabel tumbuh > ~10.000 baris, index ini
-- akan mulai berguna. Saya sarankan PERTahankan.

-- idx_cand_updated_at   — ORDER BY updated_at DESC  (loadCandidatesUnik)
-- idx_asj_form_timestamp— ORDER BY timestamp DESC   (findForms / findFormsLight)
-- idx_schedule_created  — ORDER BY created_at DESC  (loadSchedules)
-- idx_tugas_created     — ORDER BY created_at DESC  (loadTugas)
-- idx_fcm_tokens_wa     — lookup fcm per WA (dibutuhkan kalau N+1 di
--                         actions-schedule.ts:235-250 dibatch jadi wa=in.(...))

-- Kalau toh ingin melepasnya:
-- DROP INDEX IF EXISTS idx_cand_updated_at;
-- DROP INDEX IF EXISTS idx_asj_form_timestamp;
-- DROP INDEX IF EXISTS idx_schedule_created;
-- DROP INDEX IF EXISTS idx_tugas_created;


-- =============================================================================
-- SECTION 4 — VERIFIKASI (jalankan SETELAH SECTION 2)
-- =============================================================================

-- 4.1  Pastikan semua constraint unik masih utuh.
SELECT conrelid::regclass AS tabel, conname, pg_get_constraintdef(oid) AS definisi
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND contype IN ('p','u')
  AND conrelid::regclass::text IN (
    'database_candidate','master_database_candidate','database_asj_form',
    'job_database','pemberkasan_checklist')
ORDER BY 1, 2;

-- 4.2  Sisa index per tabel — pastikan tidak ada yang hilang tanpa sengaja.
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('database_candidate','master_database_candidate',
                    'database_asj_form','job_database','pemberkasan_checklist')
ORDER BY tablename, indexname;

-- 4.3  Rasio index vs data — target: index TIDAK lebih besar dari data.
SELECT c.relname AS tabel,
       pg_size_pretty(pg_relation_size(c.oid))  AS data,
       pg_size_pretty(pg_indexes_size(c.oid))   AS index,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 12;

-- 4.4  Pastikan query utama masih cepat (bandingkan dengan baseline).
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, id_kandidat, nama_lengkap, no_wa, status_kandidat,
       id_loker_pilihan, tahapan_seleksi, updated_at, created_at, tanggal_daftar
FROM database_candidate;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM database_candidate WHERE no_wa = '6281234567890';

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, timestamp, code_job, kategory, nama_lengkap, no_wa, status
FROM database_asj_form ORDER BY timestamp DESC LIMIT 500;

-- 4.5  Catatan: statistik idx_scan TIDAK langsung berubah. PostgreSQL
--      memperbaruinya secara berkala. Untuk melihat kondisi terkini setelah
--      pembersihan, reset dulu:
--        SELECT pg_stat_reset();
--      lalu biarkan aplikasi berjalan beberapa jam, baru jalankan ulang
--      scripts/db-baseline.mjs section 13.

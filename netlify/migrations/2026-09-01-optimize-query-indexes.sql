-- =============================================================================
-- 2026-09-01 (b) — Index pendukung query hasil optimasi kode aplikasi
-- -----------------------------------------------------------------------------
-- Latar belakang:
--   Optimasi kode aplikasi (PostgREST/Supabase REST) mengganti pola
--   "SELECT * limit 500 lalu find di JS" menjadi query targeted:
--     - database_schedule WHERE id_jadwal = ? OR id = ?
--     - database_tugas    WHERE id_tugas  = ? OR id = ?
--     - fcm_tokens        WHERE wa IN (...)
--     - database_asj_form WHERE no_wa = ? (already covered by existing index)
--
--   Query targeted ini butuh index pada kolom filter supaya planner
--   memilih Index Scan, bukan Seq Scan. Pada tabel kecil saat ini
--   (database_schedule ~20 baris, database_tugas ~5 baris, fcm_tokens
--   ~50 baris) Seq Scan masih lebih cepat — TAPI saat tabel tumbuh,
--   index ini akan mencegah degradasi performa.
--
--   Index di bawah HANYA dibuat kalau belum ada (IF NOT EXISTS).
--   Semua dibuat CONCURRENTLY (tidak mengunci tabel).
-- =============================================================================

-- 1. database_schedule: lookup by id_jadwal (hapus/edit jadwal targeted query)
--    id sudah punya primary key index, tapi id_jadwal belum.
CREATE INDEX IF NOT EXISTS idx_schedule_id_jadwal
ON database_schedule(id_jadwal);

-- 2. database_tugas: lookup by id_tugas (edit/hapus tugas targeted query)
--    id sudah punya primary key index, tapi id_tugas belum.
CREATE INDEX IF NOT EXISTS idx_tugas_id_tugas
ON database_tugas(id_tugas);

-- 3. fcm_tokens: lookup by wa IN (...) (batch FCM token fetch)
--    Index ini sudah ada di audit sebelumnya (idx_fcm_tokens_wa).
--    Dibuat ulang di sini cuma sebagai dokumentasi — IF NOT EXISTS aman.
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_wa
ON fcm_tokens(wa);

-- 4. database_schedule: filter by status_jadwal (reminders query)
--    Dipakai handleCheckAndSendAgendaReminders: WHERE status_jadwal = 'AKTIF'
--    Partial index — hanya baris AKTIF, jauh lebih kecil dari full index.
CREATE INDEX IF NOT EXISTS idx_schedule_status_aktif
ON database_schedule(id)
WHERE status_jadwal = 'AKTIF';

-- =============================================================================
-- VERIFIKASI (jalankan SETELAH migrasi)
-- =============================================================================

-- Pastikan index baru sudah ada.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_schedule_id_jadwal',
    'idx_tugas_id_tugas',
    'idx_fcm_tokens_wa',
    'idx_schedule_status_aktif'
  )
ORDER BY tablename, indexname;

-- Bandingkan ukuran index vs data (target: index tidak lebih besar dari data).
SELECT c.relname AS tabel,
       pg_size_pretty(pg_relation_size(c.oid))  AS data,
       pg_size_pretty(pg_indexes_size(c.oid))   AS index,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN ('database_schedule','database_tugas','fcm_tokens')
ORDER BY pg_total_relation_size(c.oid) DESC;

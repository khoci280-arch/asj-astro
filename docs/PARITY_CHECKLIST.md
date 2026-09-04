# ✅ Checklist Parity 1:1 — Modal & Button (legacy live ↔ Astro v2)

> **Cara pakai:** satu baris = satu unit. Crosscheck "sampai akar": (1) pemicu button/event
> wired di UI Astro; (2) field/state 1:1 dgn legacy (`khoci921/js/*` + `docs/*-DEEP.md`);
> (3) action + endpoint + payload + session cocok dgn handler backend (kontrak legacy);
> (4) response diproses benar (success/error/session); (5) tabel/efek samping benar; (6) i18n
> ID/JP ada; (7) improve bila jelas (codebase modern).
> Status: ⬜ belum dicek · 🔄 sedang · ✅ selesai (tanggal) · ⚠️ ditemukan delta (link catatan)
> Acuan matriks fitur: `docs/LEGACY_PARITY_REFERENCE.md`; delta form: `docs/PARITY_QA_2026-09-04.md`.

## A. Modal Admin (panel `admin.html` ↔ `admin.astro`)

| # | Modal / aksi (legacy trigger → file legacy) | Komponen Astro | Status | Catatan |
|---|---|---|---|---|
| A01 | Cek Data siswa (`bukaModalCekDataSiswa` → `admin_ops/candidates.ts`) | `CekSiswaModal.tsx` | ✅ 2026-09-04 | Rebuild lama salah sumber data (`getAppData 'siswa'`) & field (wa/status/kelas); dikoreksi ke `getDaftarSiswaBaru` + tabel No/Nama/JK/Alamat + state session/error |
| A02 | Profil kandidat (`bukaModalKandidat`; dossier `modal-cv` → `simpanCatatanCv`) | `CandidateProfileModal.tsx` | ✅ 2026-09-04 | Sumber data dikoreksi: row ter-dekorasi `getCandidatesPage` dikirim lewat event (sebelumnya `getAppData 'kandidat'` ditolak sesi admin → selalu kosong); fallback = `getExistingCandidateJsonByWa`; tombol Simpan Evaluasi di-wire ke `updateCatatanKandidat` (catatan_internal/external + tag [VIP], colom internal/ext kini benar-benar ditulis backend); badge [VIP] vs KELAS dipisah (`mapCandidate`); tile JFT/SSW = nilai teks (bukan URL), fisik = TB/BB; refresh daftar via event `candidates-changed` |
| A03 | Tambah/edit kandidat (`bukaModalTambahKandidat`/`prosesUploadKandidat` + `bukaSuperEditKandidat`/`simpanSuperEditKandidat`, `js/api/candidates.ts`) | `EditCandidateModal.tsx` + `InputManualModal.tsx` | ✅ 2026-09-04 | Root-fix: (1) InputManual kirim raw FormData tanpa action → no-op "pong"; kini Cloudinary → JSON `simpanKandidatDanUpload` + dokumen lain via `simpanBerkasTahapan`; (2) EditCandidateModal baca field lama (tmplahir/fisik/jft-URL) → prefill kosong & nilai salah; kini field mapCandidate (tempatLahir/tglLahir/tb/bb/jftText/sswText) + usia auto dari tglLahir; (3) payload super-edit drop pendidikan/catatanExt/isVip → backend kini persist `pendidikan`+`catatan_external`+tag [VIP] di `catatan_internal` (VIP tidak lagi nempel di catatan_admin); (4) upload dokumen dulu hanya ke Cloudinary tanpa persist → kini `simpanBerkasTahapan`; (5) kolom Catatan tabel = `catatanExt‖catatan` (parity legacy); refresh via `candidates-changed` |
| A04 | List kandidat per job (`bukaModalListKandidat` → `js/render/admin.ts` count cell; `keluarkanKandidatDariJob`/`mulaiKirimUndanganGrup`, `js/admin_ops/candidates.ts`) | `ListKandidatModal.tsx` | ✅ 2026-09-04 | Root-fix: (1) data lama hanya filter halaman store (≤20 baris) → count/list salah; kini `fetchAllKandidat()` (loop `getCandidatesPage` 200/halaman) di store + refresh tiap buka, count cell TabDbJob ikut benar; (2) tombol 👁 dossier legacy (`bukaDigitalCV`) ditambahkan → event `showCandidateHistory`; (3) Undang Grup kirim payload array [waList,pesan,interval] yang salah + di-queue ke worker `wa.broadcast` yang **NOT_IMPL** → tidak pernah terkirim; kini payload object legacy `{candidates,jobCode,linkGrup,interval}` + worker sweep-queue benar-benar mengirim via `handleKirimTawaranMassal`; (4) remove → `tandaiGagalJob [wa,code]` (backend sudah guard admin) + refresh store penuh |
| A05 | Pemberkasan checklist (`bukaModalPemberkasan`/`prosesUploadPemberkasan`/`prosesSimpanBiodataLengkap`, `js/03_candidate.ts` + `#modal-pemberkasan`) | `PemberkasanModal.tsx` | ✅ 2026-09-04 | Root-fix: (1) `jenisBerkas` lama = `id.toUpperCase()` ('SD','UNIV','CERT','FOTO2','IJINORTU','KAWIN','SEHAT') — token TIDAK ada di FILE_LABEL_COLUMNS backend → mayoritas dokumen di-upload ke Cloudinary tapi TIDAK di-persist; kini token kanonik backend lewat `src/lib/berkasCatalog.ts` (shared modal + dashboard) + alias label legacy ditambahkan di backend; (2) `simpanBiodataLengkap` NOT_IMPL di surface → biodata tidak pernah tersimpan; kini handler nyata di contexts/master-data (guard session + owner-or-admin sebelum DB) + surface MASTER_ACTIONS; (3) tanpa prefill: checklist Sudah/Belum per dokumen, auto-fill biodata c.bio (short→long keys, tgllahir DD/MM/YYYY→ISO), gating panel per tahapan kandidat, konfirmasi timpa file lama, upload serial w/ retry 3x backoff; (4) CandidateDash baca `kandidatData` yang tidak pernah dikembalikan backend (bentuk asli = `candidates[0]` ter-dekorasi) → dash kosong & progres pemberkasan palsu; kini adapter ke bentuk asli + prefill modal + refresh `candidates-changed`. +7 test backend (`service-a05.test.ts`), +4 test frontend (PemberkasanModal); backend 25 file/232 test, frontend 8 file/58 test hijau |
| A06 | Undangan kelas WA — grup orang tua/wali (`bukaModalUndanganKelas`/`previewUndanganKelas`/`kirimUndanganKelas`, `js/admin_ops/candidates.ts` + `#modal-undangan-kelas`) | `UndanganKelasModal.tsx` | ✅ 2026-09-04 | Root-fix: (1) `parseDaftarOrtu` hanya menerima 628… — baris 08xx/8xx yang valid di legacy (`normalizeWaInput`) dihitung invalid & dibuang; kini normalize via `shared/wa-rules` (parity legacy) + fns di-export untuk test; (2) `kirimTawaranMassal` di rebuild = async-accepted (job queue wa.broadcast), bukan sinkron → modal lama membaca `res.results` kosong → toast "0 undangan terkirim" menyesatkan; kini: accepted → toast antrean (job id), polling `getJobStatus` (6 dtk, cap ±9 mnt) sampai done → ringkasan hasil akhir (hasil job di-persist oleh `recordJobResult` di sweep-queue, sebelumnya hasil handler dibuang oleh completeJob); (3) placeholder i18n + key hilang (`ui.sending`, `ui.group_link_placeholder`, `ui.start_invite`, `ui.toast_invites_queued`; `toast_invalid_rows_n` disinkron ke teks legacy); (4) ikon header modal `link`/`stopwatch`/`comment-dots` tidak ada di sprite (builder hanya scan JSX `<Icon name=…/>`, bukan hyperscript `h(Icon, { name: … })`) → scanner diperluas + sprite di-regenerate; (5) mapping `getJobStatus` hilang di `apiEndpoint.ts` → ditambah. +8 test frontend (parser parity + preview); frontend 9 file/66 test, backend 25 file/232 test hijau |
| A07 | TTD (esign) (`bukaModalTtd`/`bukaLayarCanvas`/`submitDataEsignFull`, `js/12_esign_match.ts` + `#modal-ttd` + `#modal-fs-canvas`) | `EsignNaiteiModal.tsx` (baru; `ESignatureModal.tsx` lama orfan) | ✅ 2026-09-04 | Root-fix: (1) rebuild lama cuma SATU area tanda tangan (`saveSignature` → ttd1 saja); legacy `#modal-ttd` punya 4 area — ttd1+nama1 (Pihak 1) & ttd2+nama2 (Pihak 2/Wali), tiap area digambar di layar penuh canvas (area Nama kanvas lebar + hint rotate HP); kini `EsignNaiteiModal` mem-port penuh → submit sekali `simpanDataTtdNaitei {wa,ttd1,nama1,ttd2,nama2}` base64 dataUrl + event `candidates-changed`; (2) handler backend hanya `requireRole('kandidat')` → admin ditolak, dan hanya terima objek padahal callAPI kirim ARRAY args → wa tak pernah ketemu; kini verifyToken kandidat/admin + unwrap array (objek legacy GAS & array args dua-duanya diterima), scope owner-or-admin + cek IDOR tetap dipertahankan (semua rejection sebelum DB); (3) tombol E-Sign CandidateDash di-wire ke modal + gating tahapan = regex legacy bukaModalTtd (LOLOS..NAITEI, `allowedTahapanEsign` di-export utk test); (4) ~24 kunci i18n baru (area 2 pihak, hint, esign.clear/save, toast); (5) ikon canvas (file-signature/pen/users/eraser/…) masuk sprite; komponen menghindari literal nama ikon dalam ekspresi (spt `tone === 'sky'`) → false-positive scanner turun 2→1. +6 test backend (`service-a07.test.ts`), +8 test frontend (EsignNaiteiModal); frontend 10 file/74 test, backend 26 file/238 test hijau |
| A08 | Ganti password (`bukaModalGantiPass`) | `ChangePasswordModal.tsx` | ⬜ | |
| A09 | CV mini (`bukaModalCvMini`, `10_cv_rirekisho`) | `CvMiniModal.tsx` | ⬜ | |
| A10 | Preview CV / Rirekisho (`bukaPreviewCV`) | `RirekishoBuilder.tsx` / `DocumentPreviewModal` | ⬜ | |
| A11 | Admin AI Copilot (`bukaAdminAiCopilot`, `ai_copilot/admin`) | `AdminAiCopilot.tsx` | ⬜ | |
| A12 | Rincian builder (`openRincianBuilder`, `13_rincian_builder`) | `InputManualModal.tsx` | ⬜ | |
| A13 | Laporan bulanan (`showMonthlyReport`) | `LaporanBulananModal.tsx` | ⬜ | |
| A14 | Matchmaking AI | `MatchmakingModal.tsx` | ⬜ | |
| A15 | Share settings job | `AdminShareModal.tsx` | ⬜ | `updateDokumenShare` ✅ backend |
| A16 | AI Interview simulator (`bukaSimulatorInterview`) | ❓ | ⬜ | cek keberadaan (EditCandidate?) |
| A17 | Edit loker (modal/ops job `admin_modal/job.ts`) | `AdminJobEditModal.tsx` | ⬜ | |
| A18 | DB filter/sort (ops `admin_modal/dbfilter.ts`) | Tab header filter | ⬜ | |
| A19 | CV manual (ops `admin_modal/cv.ts`) | `InputManualModal`/`RirekishoBuilder` | ⬜ | |

## B. Modal Kandidat/Publik

| # | Modal / fitur | Komponen Astro | Status | Catatan |
|---|---|---|---|---|
| B01 | Login kandidat/admin | `LoginModal.tsx` | ⬜ | |
| B02 | WA Pintar | `WAPintarModal.tsx` | ⬜ | |
| B03 | Preview dokumen | `DocumentPreviewModal.tsx` | ⬜ | |
| B04 | Detail loker (publik) | `LokerDetailModal.tsx` | ⬜ | |
| B05 | Pamflet | `PamfletModal.tsx` | ⬜ | |
| B06 | Share viewer (TSK) | `ShareView.tsx` + `share.astro` | ⚠️ P1 | backend `shareData` belum live (butuh per-job token) — lihat PARITY_REFERENCE §5 |
| B07 | Cek data siswa (dari landing) | `CekSiswaModal.tsx` (shared) | ✅ 2026-09-04 | A01 |

## C. Form / Alur (per halaman) — wiring form→backend

| # | Halaman | Status | Catatan |
|---|---|---|---|
| C01 | apply-full → `submitApply` | 🔄 fix submit sesi ini (action/payload/success); sisa polish A3–A5 di PARITY_QA | |
| C02 | master-full → `submitMasterForm` | ⚠️ no-op FormData (M1/M2) | |
| C03 | ai-cv → `submitDataAsj` dkk | ⚠️ no-op FormData (AI2/AI3) | |
| C04 | siswa-baru → `processSiswaAIChat` + `submitDaftarSiswa` | ⚠️ chat 404 + save no-op (S1–S3) | |
| C05 | Dokumen/berkas kandidat (upload/simpan/revisi) | 🔄 surface docs sudah di-wire sesi ini; UI modal A belum dicek 1:1 | |
| C06 | Share viewer | ⚠️ P1 | |

## D. Buttons lintas tab (crosscheck saat buka tiap tab/modal di atas)

Simpan/panggil, filter/sort, CSV export, muat-lebih, WA template simpan, kirim massal,
pengumuman (sys_config), migrasi (admin ops), switch tab — **dicakup per baris A/B saat
crosscheck** (cek disabled/event/action).

## Progres
- 2026-09-04: checklist dibuat; A01/B07 selesai (CekSiswaModal root-fixed); C05 backend wired; C01 sebagian.
- 2026-09-04 (lanj.): A02 selesai (CandidateProfileModal root-fixed — data seed + fallback benar,
  simpan evaluasi/VIP live, tag kelas vs VIP konsisten legacy, refresh otomatis). +6 test backend
  (`service-a02.test.ts`), +1 test frontend; backend 24 file/222 test, frontend 6 file/48 test hijau.
- 2026-09-04 (lanj.): A03 selesai (EditCandidateModal + InputManualModal root-fixed — submit
  JSON+action, upload Cloudinary→persist, payload super-edit lengkap dgn pendidikan/catatanExt/VIP
  internal, field prefill mapCandidate, kolom Catatan = ext‖admin). +3 test backend (patch-builder),
  +1 test frontend; backend 24 file/225 test, frontend 6 file/49 test hijau.
- 2026-09-04 (lanj.): A04 selesai (ListKandidatModal root-fixed — sumber data penuh
  `fetchAllKandidat`, tombol dossier legacy, payload undang-grup object + worker `wa.broadcast`
  diimplementasikan di sweep-queue [sebelumnya NOT_IMPL → undangan tak pernah terkirim],
  remove via tandaiGagalJob + refresh). +5 test frontend (ListKandidatModal); frontend 7 file/54
  test, backend 24 file/225 test hijau.
- 2026-09-04 (lanj.): A05 selesai (PemberkasanModal root-fixed — jenis berkas kanonik backend via
  berkasCatalog (dulu mayoritas dokumen diam-diam tidak di-persist), simpanBiodataLengkap live
  (dulu NOT_IMPL di surface; kini handler master-data ber-guard + surface MASTER_ACTIONS),
  checklist Sudah/Belum + auto-fill biodata + gating tahapan + konfirmasi timpa + retry serial,
  dan adapter CandidateDash ke bentuk getAppData asli `candidates[0]` + refresh candidates-changed
  (dulu baca `kandidatData` yang tak pernah ada → dash kosong). +7 test backend (`service-a05.test.ts`),
  +4 test frontend (PemberkasanModal); backend 25 file/232 test, frontend 8 file/58 test hijau.
- 2026-09-04 (lanj.): A06 selesai (UndanganKelasModal root-fixed — parse daftar ortu kini
  normalisasi 08xx/8xx→628xx via shared/wa-rules (dulu baris valid legacy dibuang); broadcast
  massal di rebuild async-accepted (job queue) → modal lama laporkan "0 terkirim"; kini antrean
  + polling getJobStatus & hasil job di-persist oleh recordJobResult di sweep-queue (sebelumnya
  completeJob membuang hasil handler); + i18n keys & placeholder; ikon hyperscript `link`/
  `stopwatch`/`comment-dots` masuk sprite (scanner diperluas ke `h(Icon,{name:…})` + regenerate);
  mapping apiEndpoint getJobStatus ditambah). +8 test frontend (UndanganKelasModal); frontend
  9 file/66 test, backend 25 file/232 test hijau.
- 2026-09-04 (lanj.): A07 selesai (TTD/esign root-fixed — rebuild lama cuma 1 area tanda tangan
  `saveSignature`→ttd1; kini `EsignNaiteiModal` port penuh `#modal-ttd` legacy: 4 area ttd+nama
  2 pihak, layar gambar penuh canvas, submit `simpanDataTtdNaitei` sekali; handler backend di-guard
  kandidat(admin boleh, dulu kandidat-only) + terima ARRAY args callAPI maupun objek GAS legacy
  (dulu hanya objek → wa tak pernah ketemu via HTTP), scope owner-or-admin & IDOR dipertahankan;
  tombol E-Sign CandidateDash di-wire + gating tahapan regex legacy; i18n keys; icon sprite
  diperluas (file-signature/pen/users/eraser/dst; komponen menghindari literal nama ikon di
  dalam ekspresi spt `tone === 'sky'` → false-positive scanner turun 2→1); ESignatureModal lama
  jadi orfan). +6 test backend (`service-a07.test.ts`), +8 test
  frontend (EsignNaiteiModal); frontend 10 file/74 test, backend 26 file/238 test hijau.
- Urutan kerja usulan berikutnya: C04 (siswa, kontrak lengkap) → C02 (master) → C03 (ai-cv) →
  A08–A19 per modal di atas → C06 (share token) — update baris ini tiap sesi.

import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Dua project: frontend (jsdom, butuh DOM buat komponen Preact) dan backend
// (node, karena netlify functions menyentuh crypto/fs dan tidak punya DOM).
//
// LATAR BELAKANG: sebelumnya `include` cuma `src/**` + `e2e/**`, jadi 13 suite
// backend di netlify/functions/_lib TIDAK PERNAH dijalankan — 4 test gagal
// (bug normalisasi nomor WA) tanpa ada yang tahu. Jangan persempit include ini lagi.
export default defineConfig({
  test: {
    globals: true,
    // ── pool: 'threads' is REQUIRED — jangan dihapus ───────────────────────
    // Dengan pool default 'forks' di Vitest 4.x + Windows, semua test lulus
    // tapi runner TIDAK PERNAH keluar: `npx vitest run` hang selamanya setelah
    // mencetak hasil (terverifikasi: 7 dari 18 file backend, di-kill di 45s).
    // Job CI lalu kena timeout dan dibatalkan tanpa output berguna.
    // 'threads' teardown dengan benar — 223 test selesai ~2.5 detik.
    // Kalau mau balik ke 'forks', verifikasi dulu satu run penuh keluar dengan
    // exit code 0 di Windows sebelum commit.
    //
    // PENTING: `pool` TIDAK diwariskan ke `projects` — harus diset ulang di
    // setiap project di bawah (kalau tidak, file test lulus semua tapi proses
    // tidak pernah exit dan job CI digantung sampai timeout).
    pool: 'threads',
    // Batas atas agar test yang macet tidak bisa menggantung job CI lagi.
    testTimeout: 15000,
    teardownTimeout: 20000,
    projects: [
      {
        plugins: [preact()],
        test: {
          name: 'frontend',
          environment: 'jsdom',
          pool: 'threads',
          include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.{ts,tsx}'],
          exclude: ['node_modules/**', 'dist/**'],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          pool: 'threads',
          include: ['netlify/functions/**/*.test.ts', 'shared/**/*.test.ts'],
          exclude: ['node_modules/**', 'dist/**', 'netlify/functions/.netlify-built/**'],
        },
      },
      {
        test: {
          // Code index (docs/CODE_INDEX_DESIGN.md). pool: 'threads' is required
          // on Windows — same hang lesson as the backend project above.
          name: 'indexer',
          environment: 'node',
          pool: 'threads',
          include: ['indexer/**/*.test.ts'],
          exclude: ['node_modules/**', 'dist/**', 'indexer/dist/**'],
        },
      },
    ],
  },
});

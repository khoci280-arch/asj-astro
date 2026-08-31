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
    projects: [
      {
        plugins: [preact()],
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.{ts,tsx}'],
          exclude: ['legacy/**', 'node_modules/**', 'dist/**'],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: ['netlify/functions/**/*.test.ts', 'shared/**/*.test.ts'],
          exclude: ['legacy/**', 'node_modules/**', 'dist/**', 'netlify/functions/.netlify-built/**'],
        },
      },
    ],
  },
});

import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.{ts,tsx}'],
    exclude: ['legacy/**', 'node_modules/**', 'dist/**'],
  },
});

import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [preact()],
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["preact", "preact/compat", "preact/hooks"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['preact'],
          },
        },
      },
    },
  },
});

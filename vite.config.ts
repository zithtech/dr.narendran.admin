/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Backend dev server pointing to dr.narendran.adminbackend on port 5000 */
const API_DEV_TARGET = 'http://localhost:5000';

export default defineConfig({
  plugins: [
    react(),
    // Tailwind v4 runs as a Vite plugin. There is no tailwind.config.js and no
    // PostCSS chain any more - theme tokens live in src/styles/index.css
    // under `@theme`.
    tailwindcss(),
  ],

  resolve: {
    alias: {
      // Mirrors `paths` in tsconfig.app.json. Both are needed: tsc uses its
      // copy to resolve types, Vite uses this one to resolve the bundle.
      // `fileURLToPath` rather than a bare string so this works on Windows,
      // where a raw path would produce backslashes Rollup cannot match.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    // Proxy instead of CORS. The backend's CORS_ORIGINS allowlist is empty, so
    // `origin: false` rejects every browser origin. Routing /api through the
    // dev server makes requests same-origin - no preflight, and no change
    // required in backend/.env to develop locally.
    //
    // Production does NOT use this path: there the app calls
    // VITE_API_BASE_URL directly and the real origin must be added to
    // CORS_ORIGINS on the backend. See README.
    proxy: {
      '/api': {
        target: API_DEV_TARGET,
        changeOrigin: true,
      },
    },
  },

  build: {
    // Source maps ship to Vercel so production stack traces stay readable.
    // They expose original source; drop to `false` if that is unacceptable.
    sourcemap: true,
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Config and entrypoints have no branches worth covering; excluding them
      // keeps the percentage honest instead of flattering.
      exclude: [
        '**/*.config.*',
        '**/src/main.tsx',
        '**/src/test/**',
        '**/*.d.ts',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
  },
});

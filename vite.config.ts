/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Aperçu sous forme d'une seule page (artifact) : pas de service worker.
      disable: mode === 'artifact',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Mon espace',
        short_name: 'Mon espace',
        description: 'Apprendre, bouger, cuisiner, entraîner son cerveau — en sessions courtes.',
        lang: 'fr',
        start_url: '.',
        display: 'standalone',
        background_color: '#101418',
        theme_color: '#101418',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        // Python (≈ 13 Mo) n'est mis en cache qu'à la première ouverture du parcours Code.
        globIgnores: ['pyodide/**'],
        runtimeCaching: [
          {
            urlPattern: /\/pyodide\//,
            handler: 'CacheFirst',
            options: { cacheName: 'pyodide', expiration: { maxEntries: 20 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  // Worker Python en module ES : Pyodide n'accepte plus les workers classiques.
  worker: { format: 'es' },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
}));

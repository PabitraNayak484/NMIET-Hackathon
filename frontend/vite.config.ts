import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'SATHI',
        short_name: 'SATHI',
        description: 'Smart AI Teaching and Helpful Intelligence — offline-first learning agent',
        theme_color: '#0F1117',
        background_color: '#0F1117',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/content\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'content-packs',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});


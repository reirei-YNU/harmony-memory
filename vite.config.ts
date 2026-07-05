import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages at https://<user>.github.io/harmony-memory/
export default defineConfig({
  base: '/harmony-memory/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Harmony Memory - ピアノ練習記録',
        short_name: 'HarmonyMemory',
        description: '曲ごと・レベルごとに練習録音を記録できる、この端末専用の学習記録アプリ',
        theme_color: '#4c3b8f',
        background_color: '#faf7f2',
        display: 'standalone',
        start_url: '/harmony-memory/',
        scope: '/harmony-memory/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Audio recordings live in IndexedDB, not as fetched assets; keep the
        // service worker's precache to the app shell only.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})

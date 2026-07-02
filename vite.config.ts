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
        description: '曲ごと・レベルごとに練習録音を記録し、先生や仲間と共有できるアプリ',
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
        // Audio recordings are stored in Supabase Storage; do not cache large
        // media blobs indefinitely in the service worker cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})

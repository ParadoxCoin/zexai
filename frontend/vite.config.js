import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   injectRegister: 'auto',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
    //     cleanupOutdatedCaches: true,
    //     maximumFileSizeToCacheInBytes: 5000000
    //   },
    //   manifest: {
    //     name: "ZexAi",
    //     short_name: "ZexAi",
    //     description: "Profesyonel AI içerik üretim platformu - Görsel, Video, Ses ve Chat",
    //     theme_color: "#6366f1",
    //     background_color: "#0f172a",
    //     display: "standalone",
    //     icons: [
    //       {
    //         src: '/icons/icon-192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/icon-512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Local backend dev server (FastAPI)
      // Keeps frontend code simple: apiService can keep default baseURL "/api/v1".
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // WebSocket endpoints (if used in dev)
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})

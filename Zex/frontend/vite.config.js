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
  build: {
    // Raise warning threshold — Web3 bundles are inherently large (~1.4 MB gzipped).
    // The key win is that non-Web3 pages never download these chunks.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Web3 vendor (wagmi + viem + ethers + appkit + walletconnect) ────
          // These packages are deeply coupled and must be in the SAME chunk to
          // avoid circular dependency errors. Lazy-loading via LazyWeb3Shell
          // ensures this ~1.4 MB gzipped chunk is never downloaded by non-Web3 users.
          if (
            id.includes('node_modules/ethers') ||
            id.includes('node_modules/viem') ||
            id.includes('node_modules/@wagmi/core') ||
            id.includes('node_modules/wagmi') ||
            id.includes('node_modules/ox/') ||
            id.includes('node_modules/@reown/appkit') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@base-org/account')
          ) {
            return 'web3-vendor';
          }

          // ── React ecosystem ─────────────────────────────────────────────────
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }

          // ── Animation / motion ──────────────────────────────────────────────
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }

          // ── UI utilities (tanstack-query, i18n, axios) ──────────────────────
          if (
            id.includes('node_modules/@tanstack/react-query') ||
            id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next') ||
            id.includes('node_modules/axios')
          ) {
            return 'ui-utils';
          }

          // ── Charts (recharts) — only loaded on analytics tab ────────────────
          // Keeps AnalyticsDashboardPanel and any other chart-using components
          // from bloating the main bundle. ~120 kB gzipped, loaded on demand.
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts-vendor';
          }

          // ── Code syntax highlighting ─────────────────────────────────────────
          // react-syntax-highlighter bundles ALL language grammars by default (~600 kB).
          // Isolating it means ChatPage and ComparisonChatPage share one cached chunk.
          if (
            id.includes('node_modules/react-syntax-highlighter') ||
            id.includes('node_modules/highlight.js') ||
            id.includes('node_modules/refractor') ||
            id.includes('node_modules/prismjs')
          ) {
            return 'syntax-highlighter';
          }
        },
      },
    },
  },
})

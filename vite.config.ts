import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'util', 'stream', 'url', 'http', 'https'],
      globals: {
        Buffer: true,
        global: true,
        process: false,
      },
    }),
    legacy({
      targets: ['defaults', 'not IE 11', 'Safari >= 12', 'Chrome >= 60', 'Firefox >= 60'],
    }),
  ],
  define: {
    'process.env': {},
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          'vendor-web3': ['wagmi', 'viem', '@reown/appkit', '@reown/appkit-adapter-wagmi'],
          'vendor-ui': ['react', 'react-dom', 'framer-motion', 'lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})

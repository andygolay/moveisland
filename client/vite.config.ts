import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill for Node.js globals used by Movement SDK
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Some packages need buffer
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
})

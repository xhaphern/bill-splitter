import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import envCompatible from 'vite-plugin-env-compatible'

const DEV_PORT = Number(process.env.VITE_DEV_PORT) || 5173
const DEV_HOST = process.env.VITE_DEV_HOST || 'localhost'
const PREVIEW_PORT = Number(process.env.VITE_PREVIEW_PORT) || 4173

// Full config with GitHub Pages, env plugin, dev server helpers, and Vitest support
export default defineConfig({
  plugins: [react(), envCompatible()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  experimental: {
    renderBuiltUrl(filename) {
      return '/' + filename
    }
  },
  server: {
    port: DEV_PORT,
    host: DEV_HOST,
    strictPort: true, // fail fast if 5173 is occupied
    watch: { usePolling: true }, // more reliable hot reloads
  },
  preview: {
    port: PREVIEW_PORT,
    host: DEV_HOST,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
    },
  },
})

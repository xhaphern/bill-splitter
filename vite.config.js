import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import envCompatible from 'vite-plugin-env-compatible'

// Full config with GitHub Pages, env plugin, fixed port, and Vitest support
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
  manifest: {
    name: 'Bill Splitter',
    short_name: 'Bill Splitter',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  },
  server: {
    port: 5173,
    strictPort: true, // stops auto-switching ports
    host: 'localhost',
    watch: { usePolling: true }, // more reliable hot reloads
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

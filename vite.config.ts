import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import envCompatible from "vite-plugin-env-compatible"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const coercePort = (value: string | undefined | null, fallback: number): number => {
  if (value === undefined || value === null) return fallback
  const trimmed = String(value).trim()
  if (trimmed === "") return fallback
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback
  if (parsed < 1 || parsed > 65535) return fallback
  return parsed
}

const DEV_PORT = coercePort(process.env.VITE_DEV_PORT, 5173)
const DEV_HOST = process.env.VITE_DEV_HOST || "localhost"
const PREVIEW_PORT = coercePort(process.env.VITE_PREVIEW_PORT, 4173)
const USE_POLLING = process.env.VITE_USE_POLLING === "true"
const BASE_PATH = "/"

export default defineConfig({
  plugins: [react(), envCompatible()],
  base: BASE_PATH,
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  experimental: {
    renderBuiltUrl(filename) {
      const normalizedBase = BASE_PATH.endsWith("/") ? BASE_PATH : `${BASE_PATH}/`
      const normalizedFilename = filename.startsWith("/") ? filename.slice(1) : filename
      return `${normalizedBase}${normalizedFilename}`
    },
  },
  server: {
    port: DEV_PORT,
    host: DEV_HOST,
    strictPort: true,
    watch: { usePolling: USE_POLLING },
  },
  preview: {
    port: PREVIEW_PORT,
    host: DEV_HOST,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: ["src/main.tsx"],
    },
  },
})

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock import.meta.env for testing
const mockEnv = {
  DEV: false,
  VITE_REDIRECT_URL: undefined,
}

vi.stubGlobal('import', {
  meta: {
    get env() {
      return mockEnv
    },
  },
})

// Function to test (extracted from supabaseClient.js)
const getRedirectUrl = () => {
  const envRedirect = mockEnv.VITE_REDIRECT_URL?.trim()

  if (mockEnv.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/split`
  }

  if (envRedirect) return envRedirect

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/split`
  }

  return undefined
}

describe('getRedirectUrl', () => {
  beforeEach(() => {
    mockEnv.DEV = false
    mockEnv.VITE_REDIRECT_URL = undefined
  })

  it('returns origin/split in dev mode when window is defined', () => {
    mockEnv.DEV = true
    global.window = { location: { origin: 'http://localhost:5173' } }

    const url = getRedirectUrl()

    expect(url).toBe('http://localhost:5173/split')
    delete global.window
  })

  it('returns VITE_REDIRECT_URL when explicitly set', () => {
    mockEnv.VITE_REDIRECT_URL = 'https://custom.example.com/auth'

    const url = getRedirectUrl()

    expect(url).toBe('https://custom.example.com/auth')
  })

  it('trims whitespace from VITE_REDIRECT_URL', () => {
    mockEnv.VITE_REDIRECT_URL = '  https://example.com/auth  '

    const url = getRedirectUrl()

    expect(url).toBe('https://example.com/auth')
  })

  it('returns window origin/split in prod when no env var set', () => {
    mockEnv.DEV = false
    global.window = { location: { origin: 'https://example.com' } }

    const url = getRedirectUrl()

    expect(url).toBe('https://example.com/split')
    delete global.window
  })

  it('returns undefined when no window and no env var in SSR context', () => {
    mockEnv.DEV = false
    mockEnv.VITE_REDIRECT_URL = undefined

    const url = getRedirectUrl()

    expect(url).toBeUndefined()
  })

  it('prefers dev origin over env var in dev mode', () => {
    mockEnv.DEV = true
    mockEnv.VITE_REDIRECT_URL = 'https://prod.example.com/auth'
    global.window = { location: { origin: 'http://localhost:5173' } }

    const url = getRedirectUrl()

    expect(url).toBe('http://localhost:5173/split')
    delete global.window
  })

  it('ignores empty VITE_REDIRECT_URL', () => {
    mockEnv.VITE_REDIRECT_URL = '   '
    global.window = { location: { origin: 'https://example.com' } }

    const url = getRedirectUrl()

    expect(url).toBe('https://example.com/split')
    delete global.window
  })
})
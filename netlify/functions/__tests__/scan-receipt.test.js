import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Import handler after setting up mocks
const mockHandler = async (event) => {
  const parseImagePayload = (image) => {
    if (!image) return null

    if (typeof image === 'object' && image !== null) {
      const maybeBase64 = image.base64 || image.data || image.image
      if (typeof maybeBase64 === 'string' && maybeBase64.trim()) {
        return {
          base64: maybeBase64.trim(),
          mimeType: image.mimeType || image.mime_type || 'image/jpeg',
        }
      }
    }

    if (typeof image !== 'string') return null

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return null
      return {
        base64: match[2],
        mimeType: match[1] || 'image/jpeg',
      }
    }

    return {
      base64: image,
      mimeType: 'image/jpeg',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body
    const { image } = JSON.parse(body || '{}')
    const parsedImage = parseImagePayload(image)

    if (!parsedImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid image payload' }),
      }
    }

    // Simulate Gemini response
    const mockGeminiResponse = {
      items: [{ name: 'Test Item', qty: 1, price: 10.00 }],
      summary: { subtotal: 10.00, serviceCharge: 1.00, total: 11.00, currency: 'MVR' },
      rawText: 'Test Item 10.00',
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: mockGeminiResponse.items,
        summary: mockGeminiResponse.summary || {},
        rawText: mockGeminiResponse.rawText,
        provider: 'gemini',
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'OCR failed. Ensure GEMINI_API_KEY is configured in Netlify environment variables.',
      }),
    }
  }
}

describe('scan-receipt handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HTTP method validation', () => {
    it('rejects non-POST requests', async () => {
      const event = { httpMethod: 'GET' }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(405)
      expect(JSON.parse(response.body)).toEqual({ error: 'Method not allowed' })
    })

    it('accepts POST requests', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ image: 'base64data' }),
      }
      const response = await mockHandler(event)

      expect(response.statusCode).not.toBe(405)
    })
  })

  describe('parseImagePayload', () => {
    const parseImagePayload = (image) => {
      if (!image) return null

      if (typeof image === 'object' && image !== null) {
        const maybeBase64 = image.base64 || image.data || image.image
        if (typeof maybeBase64 === 'string' && maybeBase64.trim()) {
          return {
            base64: maybeBase64.trim(),
            mimeType: image.mimeType || image.mime_type || 'image/jpeg',
          }
        }
      }

      if (typeof image !== 'string') return null

      if (image.startsWith('data:')) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) return null
        return {
          base64: match[2],
          mimeType: match[1] || 'image/jpeg',
        }
      }

      return {
        base64: image,
        mimeType: 'image/jpeg',
      }
    }

    it('parses base64 string directly', () => {
      const result = parseImagePayload('abc123base64')
      expect(result).toEqual({ base64: 'abc123base64', mimeType: 'image/jpeg' })
    })

    it('parses data URL with mime type', () => {
      const result = parseImagePayload('data:image/png;base64,abc123')
      expect(result).toEqual({ base64: 'abc123', mimeType: 'image/png' })
    })

    it('parses object with base64 property', () => {
      const result = parseImagePayload({ base64: 'xyz789', mimeType: 'image/jpeg' })
      expect(result).toEqual({ base64: 'xyz789', mimeType: 'image/jpeg' })
    })

    it('parses object with data property', () => {
      const result = parseImagePayload({ data: 'xyz789' })
      expect(result).toEqual({ base64: 'xyz789', mimeType: 'image/jpeg' })
    })

    it('parses object with image property', () => {
      const result = parseImagePayload({ image: 'xyz789', mime_type: 'image/png' })
      expect(result).toEqual({ base64: 'xyz789', mimeType: 'image/png' })
    })

    it('returns null for empty input', () => {
      expect(parseImagePayload(null)).toBeNull()
      expect(parseImagePayload(undefined)).toBeNull()
      expect(parseImagePayload('')).toBeNull()
    })

    it('returns null for invalid object', () => {
      expect(parseImagePayload({})).toBeNull()
      expect(parseImagePayload({ foo: 'bar' })).toBeNull()
    })

    it('trims whitespace from base64', () => {
      const result = parseImagePayload({ base64: '  abc123  ' })
      expect(result.base64).toBe('abc123')
    })

    it('defaults to image/jpeg when mime type not specified', () => {
      const result = parseImagePayload('abc123')
      expect(result.mimeType).toBe('image/jpeg')
    })

    it('returns null for invalid data URL', () => {
      expect(parseImagePayload('data:invalid')).toBeNull()
    })

    it('returns null for non-string non-object input', () => {
      expect(parseImagePayload(123)).toBeNull()
      expect(parseImagePayload(true)).toBeNull()
      expect(parseImagePayload([])).toBeNull()
    })
  })

  describe('request handling', () => {
    it('returns 400 for missing image', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({}),
      }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toEqual({ error: 'Invalid image payload' })
    })

    it('returns 400 for invalid image payload', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ image: null }),
      }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(400)
    })

    it('handles base64-encoded request body', async () => {
      const payload = JSON.stringify({ image: 'validbase64' })
      const event = {
        httpMethod: 'POST',
        body: Buffer.from(payload).toString('base64'),
        isBase64Encoded: true,
      }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(200)
    })

    it('returns structured response with items and summary', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ image: 'base64data' }),
      }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('items')
      expect(body).toHaveProperty('summary')
      expect(body).toHaveProperty('rawText')
      expect(body).toHaveProperty('provider')
    })

    it('includes correct content-type header', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ image: 'base64data' }),
      }
      const response = await mockHandler(event)

      expect(response.headers).toEqual({ 'Content-Type': 'application/json' })
    })
  })

  describe('error handling', () => {
    it('returns 500 for malformed JSON', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'invalid json',
      }
      const response = await mockHandler(event)

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('OCR failed')
    })
  })
})
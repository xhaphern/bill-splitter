import { describe, it, expect } from 'vitest'

// Utility function used across BillSplitter and FriendsPage
const normalizePhone = (value = '') => value.replace(/\D/g, '')

describe('normalizePhone', () => {
  it('removes all non-digit characters', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('15551234567')
  })

  it('handles phone with dashes', () => {
    expect(normalizePhone('555-123-4567')).toBe('5551234567')
  })

  it('handles phone with spaces', () => {
    expect(normalizePhone('555 123 4567')).toBe('5551234567')
  })

  it('handles phone with parentheses', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('5551234567')
  })

  it('handles international format', () => {
    expect(normalizePhone('+44 20 1234 5678')).toBe('442012345678')
  })

  it('handles already normalized phone', () => {
    expect(normalizePhone('1234567890')).toBe('1234567890')
  })

  it('returns empty string for empty input', () => {
    expect(normalizePhone('')).toBe('')
  })

  it('handles undefined input', () => {
    expect(normalizePhone(undefined)).toBe('')
  })

  it('handles null input', () => {
    expect(normalizePhone(null)).toBe('')
  })

  it('removes dots', () => {
    expect(normalizePhone('555.123.4567')).toBe('5551234567')
  })

  it('removes special characters', () => {
    expect(normalizePhone('+1-555.123#4567*ext:890')).toBe('15551234567890')
  })

  it('preserves only digits from mixed content', () => {
    expect(normalizePhone('Call me at +1 (555) 123-4567 x890')).toBe('15551234567890')
  })
})
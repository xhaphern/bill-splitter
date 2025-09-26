import { render, screen } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'

vi.mock('./supabaseClient', () => {
  const makeAsync = (value) => Promise.resolve(value)

  return {
    supabase: {
      auth: {
        getSession: () => makeAsync({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        signOut: vi.fn(),
        signInWithOAuth: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
      })),
    },
  }
})

describe('App', () => {
  it('shows navigation once app is ready', async () => {
    render(<App />)

    const heading = await screen.findByText(/Bill Splitter/i)
    expect(heading).toBeInTheDocument()

    const splitLink = await screen.findByRole('link', { name: /split/i })
    expect(splitLink).toHaveAttribute('href', '/split')
  })
})

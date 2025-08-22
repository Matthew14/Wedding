import {
 describe, it, expect, vi, beforeEach 
} from 'vitest'

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createClient } from '../server'
import { createServerClient } from '@supabase/ssr'

const mockCreateServerClient = vi.mocked(createServerClient)

// Mock Next.js cookies
const mockCookies = {
  getAll: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}))

describe('Supabase Server Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates server client with cookie handling', async () => {
    const mockClient = { auth: {}, from: vi.fn() }
    mockCreateServerClient.mockReturnValue(mockClient)
    mockCookies.getAll.mockReturnValue([])

    const client = await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
    expect(client).toBe(mockClient)
  })

  it('properly handles cookie operations', async () => {
    const mockClient = { auth: {}, from: vi.fn() }
    mockCreateServerClient.mockImplementation((url, key, options) => {
      // Test the cookie handlers
      const cookieHandler = options.cookies
      
      // Test getAll
      cookieHandler.getAll()
      expect(mockCookies.getAll).toHaveBeenCalled()

      // Test setAll
      const testCookies = [
        { name: 'test', value: 'value', options: {} }
      ]
      // @ts-expect-error - mockCookies is not a RequestCookies
      cookieHandler.setAll(testCookies)
      expect(mockCookies.set).toHaveBeenCalledWith('test', 'value', {})

      return mockClient
    })

    await createClient()
  })

  it('awaits cookies function properly', async () => {
    const cookiesPromise = Promise.resolve(mockCookies)
    const { cookies } = await import('next/headers')
    // @ts-expect-error - mockCookies is not a RequestCookies
    vi.mocked(cookies).mockReturnValue(cookiesPromise)

    await createClient()

    expect(cookies).toHaveBeenCalled()
  })
})

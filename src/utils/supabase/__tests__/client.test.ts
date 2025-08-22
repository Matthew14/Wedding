import {
 describe, it, expect, vi 
} from 'vitest'

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}))

import { createClient } from '../client'
import { createBrowserClient } from '@supabase/ssr'

const mockCreateBrowserClient = vi.mocked(createBrowserClient)

describe('Supabase Client Utils', () => {
  it('creates browser client with correct environment variables', () => {
    const mockClient = { auth: {}, from: vi.fn() }
    mockCreateBrowserClient.mockReturnValue(mockClient)

    const client = createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    expect(client).toBe(mockClient)
  })

  it('handles missing environment variables gracefully', () => {
    // Temporarily clear env vars
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const mockClient = { auth: {}, from: vi.fn() }
    mockCreateBrowserClient.mockReturnValue(mockClient)

    createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      undefined,
      undefined
    )

    // Restore env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
  })
})

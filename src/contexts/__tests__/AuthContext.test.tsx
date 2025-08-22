import {
 describe, it, expect, vi 
} from 'vitest'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { MantineProvider } from '@mantine/core'

// Simple mock of Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
    },
  }),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </MantineProvider>
)

describe('AuthContext', () => {
  it('provides auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper })
    
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(true) // Initially loading
    expect(typeof result.current.signIn).toBe('function')
    expect(typeof result.current.signOut).toBe('function')
  })

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})

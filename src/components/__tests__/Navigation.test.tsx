import {
 describe, it, expect, vi, beforeEach 
} from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}))

// Mock the CSS module
vi.mock('../Navigation.module.css', () => ({
  default: {
    header: 'header',
    link: 'link',
  },
}))

// Import after mocking
import { Navigation } from '../Navigation'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
)

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders navigation links', () => {
    render(<Navigation />, { wrapper: TestWrapper })
    
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'FAQs' })).toBeInTheDocument()
  })

  it('has correct href attributes', () => {
    render(<Navigation />, { wrapper: TestWrapper })
    
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Location' })).toHaveAttribute('href', '/location')
    expect(screen.getByRole('link', { name: 'Schedule' })).toHaveAttribute('href', '/schedule')
    expect(screen.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '/faqs')
  })

  it('has proper banner role for accessibility', () => {
    render(<Navigation />, { wrapper: TestWrapper })
    
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('renders mobile menu button', () => {
    render(<Navigation />, { wrapper: TestWrapper })
    
    const menuButton = screen.getByRole('button')
    expect(menuButton).toBeInTheDocument()
  })
})

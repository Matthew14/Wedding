# Test Directory

This directory contains testing utilities and setup files for the wedding website project.

## Files

### `setup.ts`

Global test setup file that:

- Configures jest-dom matchers
- Mocks Next.js components (router, image)
- Mocks window.matchMedia for Mantine compatibility
- Sets up environment variables for testing
- Handles cleanup after each test

### `test-utils.tsx`

Testing utilities that provide:

- Custom render function with all providers (Mantine, Auth)
- Mocked Supabase client with consistent behavior
- Re-exports of all React Testing Library utilities

## Usage

Import the custom render function and utilities:

```typescript
import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

// Use in tests
render(<MyComponent />)
expect(screen.getByText('Hello')).toBeInTheDocument()
```

## Mocking Strategy

- **Supabase**: Mocked at the client level for consistency
- **Next.js Router**: Mocked in setup with basic navigation functions
- **Window APIs**: window.matchMedia mocked for Mantine components
- **Environment Variables**: Test-specific values provided

This setup ensures tests are:

- Fast and isolated
- Consistent across different environments
- Free from external dependencies
- Compatible with all UI libraries used

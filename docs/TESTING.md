# Testing Guide

This project uses comprehensive testing at multiple levels: unit tests and end-to-end tests.

## Unit Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, modern test runner
- **Component Testing**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Test Environment**: jsdom for browser-like testing environment
- **Mocking**: Vitest's built-in mocking capabilities
- **Coverage**: v8 coverage provider

## E2E Testing Stack

- **Test Framework**: [Cypress](https://www.cypress.io/) - Modern E2E testing framework
- **Test Database**: Local Supabase instance (isolated from development data)
- **Test Server**: Next.js dev server on port 3907
- **Custom Commands**: Database utilities and authentication helpers
- **CI/CD**: Automated testing in GitHub Actions

For detailed E2E testing documentation, see [cypress/README.md](cypress/README.md).

## Test Organization

### Unit Tests

Unit tests are organized using the `__tests__` folder pattern near the System Under Test (SUT):

```
src/
├── components/
│   ├── Navigation.tsx
│   └── __tests__/
│       └── Navigation.test.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── __tests__/
│       └── AuthContext.test.tsx
├── app/
│   ├── api/
│   │   ├── faqs/
│   │   │   ├── route.ts
│   │   │   └── __tests__/
│   │   │       └── route.test.ts
│   └── faqs/
│       ├── page.tsx
│       └── __tests__/
│           └── page.test.tsx
```

### E2E Tests

E2E tests are organized in the `cypress/` directory:

```
cypress/
├── e2e/
│   ├── auth.cy.ts          # Authentication flow tests
│   └── rsvp.cy.ts          # RSVP system tests
├── fixtures/               # Test data
├── support/
│   ├── commands.ts         # Custom Cypress commands
│   └── database.ts         # Database utilities
└── tsconfig.json
```

## Running Tests

### Unit Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### E2E Tests

```bash
# Run E2E tests (automated - starts server, runs tests, stops server)
npm run test:e2e

# Open Cypress in interactive mode
npm run cypress:open

# Run Cypress tests in headless mode
npm run cypress:run

# Run Cypress tests with browser visible
npm run cypress:headed
```

For detailed E2E testing instructions, including Supabase setup and troubleshooting, see [cypress/README.md](cypress/README.md).

## Test Configuration

### Vitest Config (`vitest.config.ts`)

- Configured for React/JSX support
- jsdom environment for DOM testing
- Path aliases matching the project structure
- Coverage reporting (text, JSON, HTML)

### Setup File (`src/test/setup.ts`)

- Imports `@testing-library/jest-dom` for additional matchers
- Mocks Next.js router and image components
- Mocks environment variables for testing
- Sets up window.matchMedia for Mantine components

### Test Utils (`src/test/test-utils.tsx`)

- Custom render function with providers
- Mocked Supabase client for consistent testing
- Re-exports all React Testing Library utilities

## Testing Patterns

### Component Tests

```typescript
import { render, screen } from '@/test/test-utils'
import { Navigation } from '../Navigation'

it('renders navigation links', () => {
  render(<Navigation />)
  expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
})
```

### API Route Tests

```typescript
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

it("returns FAQs successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/faqs");
    const response = await GET(request);
    expect(response.status).toBe(200);
});
```

### Hook Tests

```typescript
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../AuthContext";

it("handles sign in", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
    await act(async () => {
        await result.current.signIn("test@example.com", "password");
    });
});
```

## Mocking Strategy

### Supabase

- Mocked at the client level in `test-utils.tsx`
- Consistent mock responses across all tests
- Easy to override for specific test scenarios

### Next.js Features

- Router: Mocked in setup file
- Image: Mocked to render standard img elements
- Environment variables: Mocked with test values

### External APIs

- Fetch: Mocked globally for API route tests
- OpenAI: Mocked in specific test files

## Coverage Goals

- **Components**: >90% coverage
- **API Routes**: >95% coverage
- **Utilities**: >95% coverage
- **Hooks/Contexts**: >90% coverage

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Descriptive Test Names**: Tests should read like documentation
3. **Arrange-Act-Assert Pattern**: Clear test structure
4. **Mock External Dependencies**: Keep tests isolated and fast
5. **Test Error Cases**: Don't just test the happy path
6. **Clean Up**: Use proper cleanup to avoid test interference

## Common Testing Scenarios

### Loading States

```typescript
it('shows loading state', () => {
  mockFetch.mockImplementation(() => new Promise(() => {}))
  render(<Component />)
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})
```

### Error Handling

```typescript
it('handles API errors', async () => {
  mockFetch.mockRejectedValue(new Error('API Error'))
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })
})
```

### User Interactions

```typescript
it('handles button click', async () => {
  const user = userEvent.setup()
  render(<Component />)
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  expect(mockFunction).toHaveBeenCalled()
})
```

## Debugging Tests

1. Use `screen.debug()` to see rendered HTML
2. Add `console.log()` statements in tests (removed in CI)
3. Use VS Code test debugging features
4. Check test output for assertion details

## CI/CD Integration

Tests run automatically on:

- Git commits (pre-commit hook)
- Pull requests
- Main branch pushes

Coverage reports are generated and can be viewed in the coverage/ directory.

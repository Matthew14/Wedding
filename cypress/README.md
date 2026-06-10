# Cypress E2E Tests

End-to-end tests for the Wedding RSVP application using Cypress against a real Cognito user pool.

## Setup

### Prerequisites

1. **Node.js** and **npm** installed
2. For auth tests locally: a valid Cognito user in pool `eu-west-1_M3B36eWfB`

### Initial Setup

```bash
npm install
```

## Running Tests

### Automated (CI — Recommended)

In CI, the `e2e` job in `.github/workflows/ci.yml`:
1. Builds the app with real Cognito secrets and stub Aurora credentials
2. Writes `cypress/fixtures/auth-data.json` from GitHub secrets
3. Runs `next start` on port 3907
4. Runs all Cypress specs in headless mode

### Local (Interactive)

1. Build the app with your local env:
   ```bash
   npm run build
   ```

2. Write a local auth fixture:
   ```bash
   cat > cypress/fixtures/auth-data.json << 'EOF'
   {
     "validUser": { "email": "ci@matthewoneill.com", "password": "your-password" },
     "invalidUser": { "email": "wrong@example.com", "password": "WrongPassword123!" },
     "testUsers": []
   }
   EOF
   ```

3. Start the server:
   ```bash
   npx next start -p 3907
   ```

4. Open Cypress in interactive mode (separate terminal):
   ```bash
   npm run cypress:open
   ```

### Headless (Local)

```bash
npm run test:e2e
```

This uses `start-server-and-test` to start the server, wait for it, run Cypress, and stop.

## Test Structure

```
cypress/
├── e2e/
│   ├── auth.cy.ts          # Authentication flow tests
│   └── accessibility.cy.ts # Accessibility (a11y) tests
├── fixtures/
│   └── auth-data.json      # Test user credentials (gitignored, written by CI)
├── support/
│   ├── commands.ts         # Custom Cypress commands
│   ├── database.ts         # cy.resetDb() — no-op (Aurora in private VPC)
│   └── e2e.ts              # Support file (auto-loaded, includes cypress-axe)
└── tsconfig.json
```

## Test Coverage

### Authentication Flow (`auth.cy.ts`)

- ✅ Login page display
- ✅ Form validation (empty submit)
- ✅ Invalid credentials error
- ✅ Valid login and redirect to dashboard
- ✅ Redirect to dashboard when already logged in
- ✅ Protected route access control
- ✅ Logout functionality
- ✅ Session persistence after page refresh

### Accessibility Tests (`accessibility.cy.ts`)

- ✅ Homepage accessibility (WCAG 2.1 Level AA)
- ✅ Login page accessibility
- ✅ 404 page accessibility

**Run accessibility tests only:**
```bash
npm run test:a11y
```

## Database

E2E tests do **not** interact with the database directly. Aurora Serverless runs in a private VPC and is not accessible from CI. The `cy.resetDb()` command is a no-op — auth and accessibility tests don't require specific DB state.

## Auth Fixture

The `cypress/fixtures/auth-data.json` file is gitignored and must be created before running tests:

```json
{
  "validUser": { "email": "ci@matthewoneill.com", "password": "<password>" },
  "invalidUser": { "email": "wrong@example.com", "password": "WrongPassword123!" },
  "testUsers": []
}
```

In CI this is written from `CYPRESS_TEST_EMAIL` and `CYPRESS_TEST_PASSWORD` GitHub secrets.

## Environment Configuration

E2E tests run against a production build (`next build` + `next start`). The build bakes in real Cognito credentials so login actually works against the live Cognito pool. Aurora credentials are stubbed in CI (the app doesn't call Aurora during auth or accessibility tests).

Key GitHub secrets required:
- `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET`
- `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD`

## Troubleshooting

### Tests Failing

1. **Auth fixture missing**: Ensure `cypress/fixtures/auth-data.json` exists with valid credentials
2. **Server not ready**: `start-server-and-test` will retry — check the port 3907 is free
3. **Cognito error**: Verify the test user exists in pool `eu-west-1_M3B36eWfB` with a permanent password

### Hydration Errors

Minified React hydration errors are filtered in `cypress/support/e2e.ts` via regex `/Minified React error #4(1[0-9]|2[0-9])/`. If new hydration errors appear, add the error number to the regex.

## CI/CD Integration

The GitHub Actions `e2e` job (`.github/workflows/ci.yml`):

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: test
  env:
    AWS_APP_ID: ci        # prevents standalone output detection
    AWS_REGION: eu-west-1
  steps:
    - Build with real Cognito secrets + stub Aurora ARNs
    - Write auth fixture from CYPRESS_TEST_EMAIL/PASSWORD secrets
    - npx start-server-and-test 'npx next start -p 3907' http://localhost:3907 'npx cypress run'
```

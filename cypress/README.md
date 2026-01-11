# Cypress E2E Tests

Comprehensive end-to-end tests for the Wedding RSVP application using Cypress with local Supabase.

## Setup

### Prerequisites

1. **Supabase CLI** installed (`brew install supabase/tap/supabase`)
2. **Docker** running (required for Supabase local dev)
3. **Node.js** and **npm** installed

### Initial Setup

The Cypress tests are already configured. No additional setup needed beyond installing dependencies:

```bash
npm install
```

## Two Supabase Instances

This project supports running **two separate Supabase instances**:

| Instance | Purpose | API Port | Studio Port | Config Directory |
|----------|---------|----------|-------------|------------------|
| **Dev** | Manual development/testing | 54321 | 54323 | `supabase/` |
| **Test** | E2E tests (isolated) | 54421 | 54423 | `supabase-test/supabase/` |

This allows you to:
- Run E2E tests without affecting your development data
- Keep test data isolated and resettable
- Work on the app while tests run in the background

## Running Tests

### Automated (Recommended)

Run tests with automatic server startup and teardown:

```bash
# First, start the test Supabase instance
npm run supabase:test:start

# Run E2E tests
npm run test:e2e
```

This command will:
1. Start Next.js dev server pointing to the TEST Supabase instance (port 54421)
2. Wait for server to be ready
3. Run all Cypress tests in headless mode
4. Stop the dev server

### Manual (Interactive)

For development and debugging:

1. Start the TEST Supabase instance:
   ```bash
   npm run supabase:test:start
   ```

2. Start dev server with test environment:
   ```bash
   npm run dev:test
   ```

3. Open Cypress in interactive mode:
   ```bash
   npm run cypress:open
   ```

4. Select a test file to run in the Cypress UI

### Development Supabase (Separate)

For regular development with persistent data:

```bash
# Start dev instance (uses port 54321)
npm run supabase:start

# Regular dev server (uses dev Supabase)
npm run dev

# View dev data in Studio
open http://localhost:54323
```

### Other Commands

- **Headless mode**: `npm run cypress:run`
- **Headed mode (see browser)**: `npm run cypress:headed`
- **Test Supabase Studio**: Visit http://localhost:54423 (when test instance is running)
- **Dev Supabase Studio**: Visit http://localhost:54323 (when dev instance is running)

## Test Structure

```
cypress/
├── e2e/
│   ├── rsvp.cy.ts          # RSVP flow tests
│   ├── auth.cy.ts          # Authentication tests
│   └── accessibility.cy.ts # Accessibility (a11y) tests
├── fixtures/
│   ├── rsvp-data.json      # Test RSVP data
│   └── auth-data.json      # Test user credentials
├── support/
│   ├── commands.ts         # Custom Cypress commands
│   ├── database.ts         # Database utilities
│   └── e2e.ts              # Support file (auto-loaded, includes cypress-axe)
└── tsconfig.json           # Cypress TypeScript config
```

## Test Coverage

### RSVP Flow (`rsvp.cy.ts`)

- ✅ Code entry and validation
- ✅ Valid/invalid code handling
- ✅ Uppercase conversion
- ✅ Code length requirements
- ✅ Complete form submission (accepting invitation)
- ✅ Declining invitation
- ✅ Invitee selection (all/partial/none)
- ✅ Form validation (including guest selection requirement)
- ✅ Villa question conditional display
- ✅ RSVP editing (resubmission)
- ✅ Database verification with null checks
- ✅ Success page with query parameter verification
- ✅ Direct link navigation
- ✅ Error handling for non-existent codes

### Authentication Flow (`auth.cy.ts`)

- ✅ Login page display
- ✅ Form validation
- ✅ Invalid credentials error
- ✅ Valid login and redirect
- ✅ Protected route access control
- ✅ Logout functionality
- ✅ Session persistence after page refresh
- ✅ Navigation state (logged in/out)
- ✅ Form disabling during submission
- ✅ Password field masking

### Accessibility Tests (`accessibility.cy.ts`)

- ✅ Homepage accessibility (WCAG 2.1 Level AA)
- ✅ Location page accessibility
- ✅ Schedule page accessibility
- ✅ FAQs page accessibility
- ✅ 404 page accessibility
- ✅ RSVP code entry page accessibility
- ✅ RSVP form page accessibility
- ✅ RSVP form with modal open accessibility
- ✅ RSVP success page accessibility (accepted)
- ✅ RSVP success page accessibility (declined)
- ✅ Keyboard navigation through site
- ✅ Skip to main content link
- ✅ Form input labels and ARIA attributes
- ✅ Radio button ARIA attributes
- ✅ Checkbox ARIA attributes
- ✅ Color contrast compliance

**Run accessibility tests only:**
```bash
npm run test:a11y
```

See [docs/ACCESSIBILITY_TESTING.md](../docs/ACCESSIBILITY_TESTING.md) for detailed information.

**Note**: All tests are passing in both local and CI environments.

## Database Management

Tests automatically reset the TEST database before each test using the `cy.resetDb()` custom command.

### Manual Database Operations

```bash
# Reset TEST database to initial state
npm run supabase:test:reset

# Check TEST Supabase status
npm run supabase:test:status

# Stop TEST Supabase
npm run supabase:test:stop

# For DEV instance, use the same commands without :test:
npm run supabase:reset
npm run supabase:status
npm run supabase:stop
```

## Creating Test Users (For Auth Tests)

Auth tests require manual setup of test users in Supabase:

1. Start Supabase: `npm run supabase:start`
2. Open Supabase Studio: http://localhost:54323
3. Navigate to **Authentication** > **Users**
4. Click **Add User** and create:
   - Email: `admin@wedding.test`
   - Password: `TestPassword123!`
5. Remove `.skip()` from auth tests in `cypress/e2e/auth.cy.ts`

## Environment Configuration

### Local Supabase Credentials

**E2E Tests use the TEST instance:**
- `NEXT_PUBLIC_SUPABASE_URL`: http://127.0.0.1:54421
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Standard local Supabase anon key)

**Regular development uses the DEV instance:**
- `NEXT_PUBLIC_SUPABASE_URL`: http://127.0.0.1:54321

These are configured in:
- `package.json` scripts (environment variables are set per script)
- `cypress/support/database.ts` (Cypress database utilities)

### Test Data

The database is seeded with:
- **Invitation**: ID `1`
- **RSVP Code**: `TEST01` (linked to above invitation)
- **Invitees**: John Doe, Jane Doe
- **Secondary RSVP**: Code `TEST02` for additional testing
- **FAQ**: Test FAQ entry

Seed data is defined in `supabase/seed.sql`.

## Troubleshooting

### Tests Failing

1. **Server not ready**: Increase timeout in `start-server-and-test` config
2. **Database errors**: Run `npm run supabase:test:reset` to reset database
3. **Port conflicts**: Ensure ports 3907 (Next.js test server) and 54421 (Test Supabase) are available
4. **Stale cache**: Clear Cypress cache with `npx cypress cache clear`

### Supabase Issues

1. **Docker not running**: Start Docker Desktop
2. **Services not starting**: Run `supabase stop` then `supabase start`
3. **Migration errors**: Check `supabase/migrations/` files for syntax errors

### Environment Issues

1. **Wrong Supabase instance**: Verify `npm run dev:test` is used, not `npm run dev`
2. **Missing env vars**: Check `cypress.env.json` exists and has correct values

## Debugging

### Visual Debugging (Interactive Mode)

Use `npm run cypress:open` to:
- See tests run in real Chrome browser
- Time-travel through test steps
- Inspect DOM at each step
- View network requests
- See console logs

### Screenshots

Failed tests automatically capture screenshots in `cypress/screenshots/`

### Logs

- Cypress logs: Console output during test run
- Database logs: Check Supabase logs via `supabase status`

## CI/CD Integration

For continuous integration:

```bash
# In CI pipeline
npm install
npm run supabase:test:start
npm run test:e2e
npm run supabase:test:stop
```

Ensure Docker is available in your CI environment.

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
1. Starts the test Supabase instance
2. Runs Next.js with test environment variables
3. Executes Cypress tests
4. Stops Supabase (even on failure)

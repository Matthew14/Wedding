/// <reference types="cypress" />

/**
 * Authentication E2E Tests
 *
 * Prerequisites:
 * - Test users must be created in Supabase Auth
 * - Use Supabase Studio (http://localhost:54323) to create test users:
 *   - Email: admin@wedding.test, Password: TestPassword123!
 *
 * To create test users via Supabase Studio:
 * 1. Start Supabase: supabase start
 * 2. Open Studio: http://localhost:54323
 * 3. Navigate to Authentication > Users
 * 4. Click "Add User" and create the test user
 */

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Reset database before each test
    cy.resetDb();
  });

  describe('Login Page', () => {
    it('should display login form', () => {
      cy.visit('/login');

      // Check page elements
      cy.contains('Wedding Dashboard').should('be.visible');
      cy.contains('Sign in to access the admin panel').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should require email and password', () => {
      cy.visit('/login');

      // Try to submit without filling form
      cy.get('button[type="submit"]').click();

      // HTML5 validation should prevent submission
      cy.get('input[type="email"]:invalid').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');

      // Wait for page to be fully loaded
      cy.contains('Wedding Dashboard').should('be.visible');
      cy.wait(500);

      // Enter invalid credentials (force to bypass Mantine's disabled state)
      cy.get('input[type="email"]').type('wrong@wedding.test', { force: true });
      cy.get('input[type="password"]').type('WrongPassword123!', { force: true });
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains(/invalid/i, { timeout: 5000 }).should('be.visible');
    });

    // NOTE: This test requires a test user to exist in Supabase Auth
    // Test user is now created automatically during database reset
    it('should login with valid credentials and redirect to dashboard', () => {
      cy.visit('/login');

      // Wait for page to be fully loaded
      cy.contains('Wedding Dashboard').should('be.visible');
      cy.wait(500);

      // Enter valid credentials (from fixtures)
      cy.fixture('auth-data').then((authData) => {
        cy.get('input[type="email"]').type(authData.validUser.email, { force: true });
        cy.get('input[type="password"]').type(authData.validUser.password, { force: true });
        cy.get('button[type="submit"]').click();

        // Should redirect to dashboard
        cy.url({ timeout: 10000 }).should('include', '/dashboard');
        cy.contains('Dashboard', { timeout: 5000 }).should('be.visible');
      });
    });

    it('should redirect to dashboard if already logged in', () => {
      // Login first
      cy.fixture('auth-data').then((authData) => {
        cy.login(authData.validUser.email, authData.validUser.password);

        // Try to visit login page
        cy.visit('/login');

        // Should redirect to dashboard
        cy.url({ timeout: 5000 }).should('include', '/dashboard');
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing dashboard without auth', () => {
      // Try to access dashboard without logging in
      cy.visit('/dashboard');

      // Should redirect to login
      cy.url({ timeout: 5000 }).should('include', '/login');
    });

    it('should allow access to dashboard when authenticated', () => {
      cy.fixture('auth-data').then((authData) => {
        // Login
        cy.login(authData.validUser.email, authData.validUser.password);

        // Access dashboard
        cy.visit('/dashboard');

        // Should stay on dashboard
        cy.url().should('include', '/dashboard');
        cy.contains('Dashboard').should('be.visible');
      });
    });
  });

  describe('Logout', () => {
    it('should logout and redirect to home', () => {
      cy.fixture('auth-data').then((authData) => {
        // Login first
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/dashboard');

        // Find and click logout button
        // Adjust selector based on actual logout button in your app
        cy.contains(/logout|sign out/i).click();

        // Should redirect away from dashboard
        cy.url({ timeout: 5000 }).should('not.include', '/dashboard');
      });
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session after page refresh', () => {
      cy.fixture('auth-data').then((authData) => {
        // Login
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/dashboard');

        // Refresh page
        cy.reload();

        // Should still be logged in
        cy.url().should('include', '/dashboard');
        cy.contains('Dashboard').should('be.visible');
      });
    });
  });

  describe('Navigation', () => {
    it('should not show dashboard link when not authenticated', () => {
      cy.visit('/');

      // Dashboard link should not be visible in navigation
      // Adjust based on your navigation implementation
      cy.get('nav').should('not.contain', 'Dashboard');
    });

    it('should show dashboard link when authenticated', () => {
      cy.fixture('auth-data').then((authData) => {
        // Login
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/');

        // Dashboard link should be visible
        cy.get('nav').should('contain', 'Dashboard');
      });
    });
  });
});

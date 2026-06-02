/// <reference types="cypress" />

/**
 * Authentication E2E Tests
 *
 * Prerequisites:
 * - A Cognito admin user must exist in the test user pool.
 * - Set credentials in cypress/fixtures/auth-data.json or via env vars.
 */

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.resetDb();
  });

  describe('Login Page', () => {
    it('should display login form', () => {
      cy.visit('/login');
      cy.contains('Wedding Dashboard').should('be.visible');
      cy.contains('Sign in to access the admin panel').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should require email and password', () => {
      cy.visit('/login');
      cy.get('button[type="submit"]').click();
      cy.get('input[type="email"]:invalid').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      cy.contains('Wedding Dashboard').should('be.visible');
      cy.wait(500);
      cy.get('input[type="email"]').type('wrong@example.com', { force: true });
      cy.get('input[type="password"]').type('WrongPassword123!', { force: true });
      cy.get('button[type="submit"]').click();
      cy.contains(/invalid|failed|error|unauthorized/i, { timeout: 5000 }).should('be.visible');
    });

    it('should login with valid credentials and redirect to dashboard', () => {
      cy.fixture('auth-data').then(authData => {
        cy.visit('/login');
        cy.contains('Wedding Dashboard').should('be.visible');
        cy.wait(500);
        cy.get('input[type="email"]').type(authData.validUser.email, { force: true });
        cy.get('input[type="password"]').type(authData.validUser.password, { force: true });
        cy.get('button[type="submit"]').click();
        cy.url({ timeout: 10000 }).should('include', '/dashboard');
      });
    });

    it('should redirect to dashboard if already logged in', () => {
      cy.fixture('auth-data').then(authData => {
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/login');
        cy.url({ timeout: 5000 }).should('include', '/dashboard');
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing dashboard without auth', () => {
      cy.visit('/dashboard');
      cy.url({ timeout: 5000 }).should('include', '/login');
    });

    it('should allow access to dashboard when authenticated', () => {
      cy.fixture('auth-data').then(authData => {
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/dashboard');
        cy.url().should('include', '/dashboard');
      });
    });
  });

  describe('Logout', () => {
    it('should logout and redirect to home', () => {
      cy.fixture('auth-data').then(authData => {
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/dashboard');
        cy.contains(/sign out/i).click();
        cy.url({ timeout: 5000 }).should('not.include', '/dashboard');
      });
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session after page refresh', () => {
      cy.fixture('auth-data').then(authData => {
        cy.login(authData.validUser.email, authData.validUser.password);
        cy.visit('/dashboard');
        cy.reload();
        cy.url().should('include', '/dashboard');
      });
    });
  });
});

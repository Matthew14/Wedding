/// <reference types="cypress" />

// Custom command to reset database
Cypress.Commands.add('resetDb', () => {
  cy.task('resetDb');
});

// Custom command to login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Wait for redirect after login
  cy.url().should('not.include', '/login');
});

// TypeScript declarations for custom commands
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Reset database to clean state with test data
       * @example cy.resetDb()
       */
      resetDb(): Chainable<void>;

      /**
       * Login with email and password
       * @example cy.login('admin@wedding.test', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
    }
  }
}

export {};

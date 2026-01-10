/// <reference types="cypress" />

import type * as axe from 'axe-core';

describe('Accessibility Tests', () => {
  /**
   * Configuration for axe-core accessibility testing
   *
   * We use a custom configuration to:
   * - Run WCAG 2.1 Level AA compliance checks (industry standard)
   * - Test against all relevant accessibility rules except color-contrast
   * - Provide detailed violation reports for debugging
   *
   * Note: color-contrast is disabled due to Cypress headless browser color
   * rendering issues that cause false positives. Color contrast should be
   * verified manually in real browsers.
   */
  const axeConfig = {
    runOnly: {
      type: 'tag' as const,
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
    rules: {
      'color-contrast': { enabled: false },
    },
  };

  /**
   * Custom callback to log accessibility violations in a readable format
   * This helps developers quickly identify and fix issues
   */
  const logViolations = (violations: axe.Result[]) => {
    cy.task(
      'log',
      `${violations.length} accessibility violation${violations.length === 1 ? '' : 's'} detected`
    );

    const violationData = violations.map(({ id, impact, description, nodes, helpUrl }) => ({
      id,
      impact: impact || 'unknown',
      description,
      nodes: nodes.length,
      helpUrl,
    }));

    cy.task('table', violationData);

    // Log detailed information about each failing node
    violations.forEach((violation) => {
      cy.task('log', `\nViolation: ${violation.id}`);
      violation.nodes.forEach((node: axe.NodeResult, index: number) => {
        cy.task('log', `  Node ${index + 1}:`);
        cy.task('log', `    HTML: ${node.html}`);
        cy.task('log', `    Target: ${node.target.join(' > ')}`);
        if (node.failureSummary) {
          cy.task('log', `    Failure: ${node.failureSummary}`);
        }
      });
    });
  };

  beforeEach(() => {
    // Reset database for consistent testing
    cy.resetDb();
  });

  describe('Public Pages', () => {
    it('Homepage should have no accessibility violations', () => {
      cy.visit('/');
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('Location page should have no accessibility violations', () => {
      cy.visit('/location');
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('Schedule page should have no accessibility violations', () => {
      cy.visit('/schedule');
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('FAQs page should have no accessibility violations', () => {
      cy.visit('/faqs');
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('404 page should have no accessibility violations', () => {
      cy.visit('/nonexistent-page', { failOnStatusCode: false });
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });
  });

  describe('RSVP Flow', () => {
    it('RSVP code entry page should have no accessibility violations', () => {
      cy.visit('/rsvp');
      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('RSVP form page should have no accessibility violations', () => {
      cy.visit('/rsvp/TEST01');

      // Wait for page to load with invitee data
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('RSVP form with modal open should have no accessibility violations', () => {
      cy.visit('/rsvp/TEST01');

      // Wait for page to load
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Form defaults to "Yes" with all invitees checked, just submit
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Wait for modal to appear
      cy.contains('Confirm & Submit', { timeout: 2000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('RSVP success page should have no accessibility violations', () => {
      cy.visit('/rsvp/success?accepted=yes&code=TEST01');

      // Wait for page to load
      cy.contains('Thank You!', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('RSVP decline success page should have no accessibility violations', () => {
      cy.visit('/rsvp/success?accepted=no&code=TEST01');

      // Wait for page to load
      cy.contains('Response Received', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });
  });

  describe('Component-specific Accessibility', () => {
    it('Form inputs should have proper labels and ARIA attributes', () => {
      cy.visit('/rsvp');

      // Check RSVP code input
      cy.get('input[placeholder="ABC123"]').should('have.attr', 'aria-label');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('Card-based selections should have proper ARIA attributes', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Verify invitee card checkboxes have proper ARIA attributes
      cy.get('[role="checkbox"][aria-label="John Doe"]')
        .should('have.attr', 'aria-checked')
        .and('have.attr', 'tabindex', '0');

      cy.get('[role="checkbox"][aria-label="Jane Doe"]')
        .should('have.attr', 'aria-checked')
        .and('have.attr', 'tabindex', '0');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });

    it('Text inputs and textareas should be accessible', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Check that form text inputs exist and are accessible
      cy.get('textarea[placeholder*="dietary"]').should('exist');
      cy.get('input[placeholder*="song"]').should('exist');

      cy.injectAxe();
      cy.checkA11y(undefined, axeConfig, logViolations);
    });
  });
});

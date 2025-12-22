/// <reference types="cypress" />

describe('Accessibility Tests', () => {
  /**
   * Configuration for axe-core accessibility testing
   *
   * We use a custom configuration to:
   * - Run WCAG 2.1 Level AA compliance checks (industry standard)
   * - Test against all relevant accessibility rules
   * - Provide detailed violation reports for debugging
   */
  const axeConfig = {
    runOnly: {
      type: 'tag' as const,
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  };

  /**
   * Custom callback to log accessibility violations in a readable format
   * This helps developers quickly identify and fix issues
   */
  interface AxeViolation {
    id: string;
    impact: string;
    description: string;
    nodes: { length: number };
  }

  const logViolations = (violations: AxeViolation[]) => {
    cy.task(
      'log',
      `${violations.length} accessibility violation${violations.length === 1 ? '' : 's'} detected`
    );

    const violationData = violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.length,
      helpUrl: `https://dequeuniversity.com/rules/axe/4.8/${id}`,
    }));

    cy.task('table', violationData);
  };

  beforeEach(() => {
    // Reset database for consistent testing
    cy.resetDb();
  });

  describe('Public Pages', () => {
    it('Homepage should have no accessibility violations', () => {
      cy.visit('/');
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('Location page should have no accessibility violations', () => {
      cy.visit('/location');
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('Schedule page should have no accessibility violations', () => {
      cy.visit('/schedule');
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('FAQs page should have no accessibility violations', () => {
      cy.visit('/faqs');
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('404 page should have no accessibility violations', () => {
      cy.visit('/nonexistent-page', { failOnStatusCode: false });
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });
  });

  describe('RSVP Flow', () => {
    it('RSVP code entry page should have no accessibility violations', () => {
      cy.visit('/rsvp');
      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('RSVP form page should have no accessibility violations', () => {
      cy.visit('/rsvp/TEST01');

      // Wait for page to load with invitee data
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('RSVP form with modal open should have no accessibility violations', () => {
      cy.visit('/rsvp/TEST01');

      // Wait for page to load
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Fill form and open confirmation modal
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();

      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Wait for modal to appear
      cy.contains('Confirm & Submit', { timeout: 2000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('RSVP success page should have no accessibility violations', () => {
      cy.visit('/rsvp/success?accepted=yes&code=TEST01');

      // Wait for page to load
      cy.contains('Thank You!', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('RSVP decline success page should have no accessibility violations', () => {
      cy.visit('/rsvp/success?accepted=no&code=TEST01');

      // Wait for page to load
      cy.contains('Response Received', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });
  });

  describe('Navigation Accessibility', () => {
    it('Should be able to navigate site with keyboard only', () => {
      cy.visit('/');

      // Tab through navigation
      cy.get('body').tab();
      cy.focused().should('contain', 'Skip to main content');

      cy.focused().tab();
      cy.focused().should('contain', 'Home');

      cy.focused().tab();
      cy.focused().should('contain', 'Location');

      cy.focused().tab();
      cy.focused().should('contain', 'Schedule');

      cy.focused().tab();
      cy.focused().should('contain', 'FAQs');

      cy.focused().tab();
      cy.focused().should('contain', 'RSVP');
    });

    it('Skip to main content link should work', () => {
      cy.visit('/');

      // Tab to skip link
      cy.get('body').tab();
      cy.focused().should('contain', 'Skip to main content');

      // Press enter
      cy.focused().type('{enter}');

      // Focus should be on main content
      cy.focused().should('have.attr', 'id', 'main-content');
    });
  });

  describe('Component-specific Accessibility', () => {
    it('Form inputs should have proper labels and ARIA attributes', () => {
      cy.visit('/rsvp');

      // Check RSVP code input
      cy.get('input[placeholder="ABC123"]').should('have.attr', 'aria-label');

      cy.injectAxe();
      cy.checkA11y(null, axeConfig, logViolations);
    });

    it('Radio buttons should have proper ARIA attributes', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();

      // Check specifically for radio button groups
      cy.checkA11y('input[type="radio"]', axeConfig, logViolations);
    });

    it('Checkboxes should have proper ARIA attributes', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      cy.injectAxe();

      // Check specifically for checkboxes
      cy.checkA11y('input[type="checkbox"]', axeConfig, logViolations);
    });
  });

  describe('Color Contrast', () => {
    it('All text should meet WCAG AA contrast requirements', () => {
      cy.visit('/');
      cy.injectAxe();

      // Run only color contrast checks
      cy.checkA11y(
        null,
        {
          runOnly: {
            type: 'tag',
            values: ['cat.color'],
          },
        },
        logViolations
      );
    });
  });
});

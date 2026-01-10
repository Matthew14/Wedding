/// <reference types="cypress" />

describe('Invitation Page', () => {
  beforeEach(() => {
    // Reset database before each test for isolation
    cy.resetDb();
  });

  describe('Valid Invitation Links', () => {
    it('should display personalized invitation for a couple', () => {
      // TEST01 is linked to John Doe and Jane Doe
      // URL format: /invitation/name-name-CODE
      cy.visit('/invitation/john-jane-TEST01');

      // Check page loads without error
      cy.contains('Rebecca & Matthew').should('be.visible');
      cy.contains('May 2026').should('be.visible');

      // Check personalized greeting
      cy.contains('Wish to invite').should('be.visible');
      cy.contains('John & Jane').should('be.visible');

      // Check invitation content
      cy.contains('to join them to celebrate their marriage').should('be.visible');
      cy.contains('Gran Villa Rosa').should('be.visible');
      cy.contains('Vilanova i la Geltrú').should('be.visible');

      // Check RSVP CTA button
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should display personalized invitation for a single guest', () => {
      // TEST02 is linked to Alice Smith
      // URL format: /invitation/name-CODE
      cy.visit('/invitation/alice-TEST02');

      // Check personalized greeting for single guest
      cy.contains('Wish to invite').should('be.visible');
      cy.contains('Alice').should('be.visible');

      // Check RSVP CTA button
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should handle case-insensitive names in URL', () => {
      // Names should be case-insensitive
      cy.visit('/invitation/JOHN-JANE-TEST01');

      cy.contains('John & Jane').should('be.visible');
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should handle names in different order', () => {
      // Order of names shouldn't matter
      cy.visit('/invitation/jane-john-TEST01');

      cy.contains('John & Jane').should('be.visible');
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should display personalized invitation for 3 guests', () => {
      // TEST03 is linked to Michael, Sarah, Emma Johnson
      cy.visit('/invitation/michael-sarah-emma-TEST03');

      // Check page loads without error
      cy.contains('Rebecca & Matthew').should('be.visible');

      // Check personalized greeting for 3 guests (Oxford comma format)
      cy.contains('Wish to invite').should('be.visible');
      cy.contains('Michael, Sarah & Emma').should('be.visible');

      // Check RSVP CTA button
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should display personalized invitation for 4 guests (family)', () => {
      // TEST04 is linked to James, Sarah, Tom, Lucy Williams
      cy.visit('/invitation/james-sarah-tom-lucy-TEST04');

      // Check page loads without error
      cy.contains('Rebecca & Matthew').should('be.visible');

      // Check personalized greeting for 4 guests
      cy.contains('Wish to invite').should('be.visible');
      cy.contains('James, Sarah, Tom & Lucy').should('be.visible');

      // Check RSVP CTA button
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should handle 3+ guest names in any order', () => {
      // Order of names shouldn't matter for 3+ guests
      cy.visit('/invitation/emma-sarah-michael-TEST03');

      // Should still display in original order from database
      cy.contains('Michael, Sarah & Emma').should('be.visible');
      cy.contains('Please click here to RSVP').should('be.visible');
    });
  });

  describe('RSVP Button Navigation', () => {
    it('should navigate to RSVP form when clicking CTA button', () => {
      cy.visit('/invitation/john-jane-TEST01');

      // Wait for invitation to load
      cy.contains('John & Jane').should('be.visible');

      // Click the RSVP button
      cy.contains('button', 'Please click here to RSVP').should('be.visible').click();

      // Should navigate to RSVP form with the code
      cy.url({ timeout: 15000 }).should('include', '/rsvp/TEST01');

      // RSVP form should load
      cy.contains('Are you joining us?', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Invalid Invitation Links', () => {
    it('should show error page for invalid code', () => {
      cy.visit('/invitation/john-BADCOD');

      // Should show error message
      cy.contains('Invitation Not Found').should('be.visible');
      cy.contains("We couldn't find this invitation").should('be.visible');

      // Should have link to RSVP page
      cy.contains('Go to RSVP Page').should('be.visible');
    });

    it('should show error page for wrong names', () => {
      // TEST01 belongs to John and Jane, not Bob
      cy.visit('/invitation/bob-TEST01');

      cy.contains('Invitation Not Found').should('be.visible');
    });

    it('should show error page for mismatched name count', () => {
      // TEST01 has 2 guests, but URL only has 1 name
      cy.visit('/invitation/john-TEST01');

      cy.contains('Invitation Not Found').should('be.visible');
    });

    it('should show error page for slug without code', () => {
      // No valid 6-char code at end
      cy.visit('/invitation/john-jane');

      cy.contains('Invitation Not Found').should('be.visible');
    });

    it('should navigate to RSVP page from error state', () => {
      cy.visit('/invitation/wrong-BADCOD');

      cy.contains('Go to RSVP Page').click();

      cy.url().should('include', '/rsvp');
      cy.url().should('not.include', '/invitation');
    });
  });

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/invitation/john-jane-TEST01');

      cy.contains('Rebecca & Matthew').should('be.visible');
      cy.contains('John & Jane').should('be.visible');
      cy.contains('Please click here to RSVP').should('be.visible');
    });

    it('should display correctly on tablet', () => {
      cy.viewport('ipad-2');
      cy.visit('/invitation/john-jane-TEST01');

      cy.contains('Rebecca & Matthew').should('be.visible');
      cy.contains('Please click here to RSVP').should('be.visible');
    });
  });

  describe('Security', () => {
    it('should not reveal if code exists when names are wrong', () => {
      // Both should show the same generic error
      cy.visit('/invitation/wrong-names-TEST01');
      cy.contains('Invitation Not Found').should('be.visible');
      cy.contains("We couldn't find this invitation").should('be.visible');
    });

    it('should not reveal if names exist when code is wrong', () => {
      cy.visit('/invitation/john-jane-WRONG1');
      cy.contains('Invitation Not Found').should('be.visible');
      cy.contains("We couldn't find this invitation").should('be.visible');
    });
  });
});

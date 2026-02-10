/// <reference types="cypress" />

describe('RSVP Flow', () => {
  beforeEach(() => {
    // Reset database before each test for isolation
    cy.resetDb();
  });

  describe('RSVP Code Entry', () => {
    it('should display the RSVP code entry page', () => {
      cy.visit('/rsvp');

      // Check page elements
      cy.contains('RSVP').should('be.visible');
      cy.contains('Please enter your unique invitation code').should('be.visible');
      cy.get('input[placeholder="ABC123"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Continue to RSVP Form');
    });

    it('should validate a valid RSVP code and redirect to form', () => {
      cy.visit('/rsvp');

      // Enter valid code
      cy.get('input[placeholder="ABC123"]').type('TEST01');

      // Wait for validation to complete (500ms debounce + API call time)
      cy.contains('Code found!', { timeout: 5000 }).should('be.visible');

      // Wait for the button to be ready (not loading, not disabled)
      cy.get('button[type="submit"]').should('not.be.disabled').should('not.have.attr', 'data-loading');

      // Submit form
      cy.get('button[type="submit"]').click();

      // Should redirect to RSVP form page with longer timeout for CI
      cy.url({ timeout: 10000 }).should('include', '/rsvp/TEST01');
    });

    it('should show error for invalid RSVP code', () => {
      cy.visit('/rsvp');

      // Enter invalid code (gets truncated to 6 chars: INVALI)
      cy.get('input[placeholder="ABC123"]').type('INVALID99');

      // Should show error message (500ms debounce + API call time)
      cy.contains("Double-check that you've entered all characters correctly", { timeout: 5000 }).should('be.visible');
    });

    it('should convert code to uppercase automatically', () => {
      cy.visit('/rsvp');

      // Enter lowercase code
      cy.get('input[placeholder="ABC123"]').type('test01');

      // Input value should be uppercase
      cy.get('input[placeholder="ABC123"]').should('have.value', 'TEST01');
    });

    it('should require exactly 6 characters', () => {
      cy.visit('/rsvp');

      // Enter short code
      cy.get('input[placeholder="ABC123"]').type('TES');

      // Submit button should be disabled (code too short)
      cy.get('button[type="submit"]').should('be.disabled');

      // Complete the code with valid TEST01
      cy.get('input[placeholder="ABC123"]').type('T01');

      // Wait for validation to complete (500ms debounce + API call time)
      cy.contains('Code found!', { timeout: 5000 }).should('be.visible');

      // Button should be enabled (valid code)
      cy.get('button[type="submit"]').should('not.be.disabled');
    });

    it('should keep button disabled for invalid 6-character code', () => {
      cy.visit('/rsvp');

      // Enter invalid 6-character code (BADCOD)
      cy.get('input[placeholder="ABC123"]').type('BADCODE'.slice(0, 6));

      // Wait for validation (500ms debounce + API call time)
      cy.contains("Double-check that you've entered all characters correctly", { timeout: 5000 }).should('be.visible');

      // Button should remain disabled for invalid code
      cy.get('button[type="submit"]').should('be.disabled');
    });

    // NOTE: Paste event testing is difficult to simulate reliably in Cypress
    // The paste handler (src/app/rsvp/page.tsx:78-82) should be manually tested:
    // - Paste valid code (e.g., "test01") -> converts to "TEST01" and validates
    // - Paste code with special chars (e.g., "TEST-01!") -> strips to "TEST01"
    // - Paste too-long code (e.g., "TEST0123") -> truncates to "TEST01"
  });

  describe('RSVP Form - Read Only (After Deadline)', () => {
    beforeEach(() => {
      // Set clock to after the RSVP deadline (28 Feb 2026 23:59 UTC)
      cy.clock(new Date('2026-03-01T00:00:00Z').getTime(), ['Date']);
      // Navigate directly to form page with valid code
      cy.visit('/rsvp/TEST01');
      // Wait for page to load - look for formatted guest names header
      cy.contains('John & Jane Doe', { timeout: 5000 }).should('be.visible');
    });

    it('should display RSVP form with invitee names', () => {
      // Header shows formatted guest names
      cy.contains('John & Jane Doe').should('be.visible');

      // Individual invitee names appear in card-style checkboxes
      cy.contains('John Doe').should('be.visible');
      cy.contains('Jane Doe').should('be.visible');
    });

    it('should show disabled info banner', () => {
      cy.contains('deadline for amending your RSVP has now passed').should('be.visible');
      cy.contains('please contact us directly').should('be.visible');
    });

    it('should not show submit button', () => {
      cy.contains('Submit RSVP').should('not.exist');
    });

    it('should have disabled text inputs', () => {
      // Message textarea is always visible and should be disabled
      cy.get('textarea[placeholder*="Any other information"]').should('be.disabled');
    });

    it('should have disabled text inputs when form data shows accepted', () => {
      // For an accepted RSVP, the dietary/song/travel fields should also be disabled
      cy.get('textarea[placeholder*="dietary"]').should('be.disabled');
      cy.get('input[placeholder*="song"]').should('be.disabled');
      cy.get('textarea[placeholder*="travel"]').should('be.disabled');
    });
  });

  describe('Direct Link Navigation', () => {
    it('should work when visiting RSVP form directly via link', () => {
      // Simulate clicking a link in invitation (direct to form)
      cy.visit('/rsvp/TEST01');

      // Should load form without going through code entry
      cy.contains('John & Jane Doe', { timeout: 5000 }).should('be.visible');
      cy.url().should('include', '/rsvp/TEST01');
    });

    it('should show error for non-existent RSVP code in direct link', () => {
      cy.visit('/rsvp/NOTEXIST', { failOnStatusCode: false });

      // Should show error or redirect
      // Adjust this based on actual error handling in the app
      cy.contains(/not found|invalid|error/i, { timeout: 5000 });
    });
  });

  describe('Villa Accommodation Not Offered', () => {
    // TEST06 is configured with villa_offered=false in seed.sql
    it('should not show villa accommodation question when villa is not offered', () => {
      cy.visit('/rsvp/TEST06');
      cy.contains('Robert Green', { timeout: 5000 }).should('be.visible');

      // Villa question should NOT be visible since villa_offered=false
      cy.get('body').should('not.contain', 'Will you be staying with us?');
    });
  });
});

/// <reference types="cypress" />

interface RsvpRecord {
  accepted: boolean;
  staying_villa: boolean;
  dietary_restrictions: string;
  song_request: string;
  travel_plans: string;
  message: string;
}

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
      cy.contains('Please enter your unique RSVP code').should('be.visible');
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

  describe('RSVP Form Submission', () => {
    beforeEach(() => {
      // Navigate directly to form page with valid code
      cy.visit('/rsvp/TEST01');
      // Wait for page to load
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');
    });

    it('should display RSVP form with invitee names', () => {
      // Check that invitees are displayed
      cy.contains('John Doe').should('be.visible');
      cy.contains('Jane Doe').should('be.visible');
    });

    it('should submit complete RSVP (accepting invitation)', () => {
      // Accept invitation - find the "Are you joining us?" section and click Yes radio
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      // Select invitees (both coming)
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();
      cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').check();

      // Staying at villa - find the villa section and click Yes radio
      cy.contains('Will you be staying with us at Gran Villa Rosa?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      // Fill optional fields
      cy.get('textarea[placeholder*="dietary"]').type('Vegetarian, no nuts');
      cy.get('input[placeholder*="song"]').type("Don't Stop Believin' - Journey");
      cy.get('textarea[placeholder*="travel"]').type('Arriving Friday evening, departing Sunday morning');
      cy.get('textarea[placeholder*="Any other information"]').type('So excited to celebrate with you!');

      // Submit form
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      // Should redirect to success page with correct query parameters
      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=yes')
        .and('include', 'code=TEST01');
      cy.contains('Thank You!', { timeout: 5000 }).should('be.visible');

      // Verify data was saved to database
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((result) => {
        const rsvp = result as RsvpRecord | null;
        if (!rsvp) {
          throw new Error('RSVP not found');
        }
        expect(rsvp.accepted).to.equal(true);
        expect(rsvp.staying_villa).to.equal(true);
        expect(rsvp.dietary_restrictions).to.equal('Vegetarian, no nuts');
        expect(rsvp.song_request).to.equal("Don't Stop Believin' - Journey");
        expect(rsvp.travel_plans).to.equal('Arriving Friday evening, departing Sunday morning');
        expect(rsvp.message).to.equal('So excited to celebrate with you!');
      });

      // Verify invitees were updated
      cy.task('queryDatabaseMultiple', {
        table: 'invitees',
        column: 'invitation_id',
        value: '11111111-1111-1111-1111-111111111111'
      }).then((invitees) => {
        if (!Array.isArray(invitees)) {
          throw new Error('Invitees not found');
        }
        expect(invitees).to.have.length(2);
        // Both should be marked as coming
        invitees.forEach(invitee => {
          expect(invitee.coming).to.equal(true);
        });
      });
    });

    it('should submit RSVP declining invitation', () => {
      // Decline invitation - find the "Are you joining us?" section and click No radio
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="no"]')
        .click({ force: true });

      // Fill message
      cy.get('textarea[placeholder*="Any other information"]').type("Unfortunately we can't make it. Wishing you all the best!");

      // Submit form
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      // Should redirect to success page with correct query parameters
      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=no')
        .and('include', 'code=TEST01');

      // Verify data was saved
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((result) => {
        const rsvp = result as RsvpRecord | null;
        if (!rsvp) {
          throw new Error('RSVP not found');
        }
        expect(rsvp.accepted).to.equal(false);
      });
    });

    it('should hide villa question when declining invitation', () => {
      // Wait for form to be fully loaded and verify default state (accepting)
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Wait for "Yes" radio to be selected by default (accepted=true)
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .should('be.checked');

      // Villa question should be visible when accepting (wait for render)
      cy.wait(1000); // Give conditional render time to complete
      cy.get('body').should('contain', 'Will you be staying with us at Gran Villa Rosa?');

      // Switch to declining
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="no"]')
        .click({ force: true });

      // Villa question should now be hidden (removed from DOM)
      cy.wait(500); // Wait for conditional render
      cy.get('body').should('not.contain', 'Will you be staying with us at Gran Villa Rosa?');

      // Invitee selection section should also be hidden (removed from DOM)
      // Note: Individual invitee names might still appear elsewhere (like in confirmation modal text)
      // so we check that the checkbox inputs are gone
      cy.get('input[type="checkbox"]').should('not.exist');

      // Switch back to accepting
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      // Villa question should be visible again
      cy.wait(500); // Wait for conditional render
      cy.get('body').should('contain', 'Will you be staying with us at Gran Villa Rosa?');

      // Invitee checkboxes should be visible again
      cy.get('input[type="checkbox"]').should('exist');
      cy.get('input[type="checkbox"]').should('have.length', 2); // John and Jane
    });

    it('should allow editing existing RSVP', () => {
      // First submission - accept invitation
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=yes')
        .and('include', 'code=TEST01');

      // Go back to form
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Should show info that we're amending
      cy.contains("You're amending your RSVP", { timeout: 5000 }).should('be.visible');

      // Form should be pre-populated - Yes radio should be checked
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .should('be.checked');

      // Make changes
      cy.get('textarea[placeholder*="dietary"]').clear().type('Gluten-free');
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      // Wait for redirect with correct query parameters
      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=yes')
        .and('include', 'code=TEST01');

      // Verify updated data
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((result) => {
        const rsvp = result as RsvpRecord | null;
        if (!rsvp) {
          throw new Error('RSVP not found');
        }
        expect(rsvp.dietary_restrictions).to.equal('Gluten-free');
      });
    });

    it('should handle partial invitee attendance', () => {
      // Accept invitation
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      // Only John is coming
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();
      cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').uncheck();

      // Submit
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=yes')
        .and('include', 'code=TEST01');

      // Verify invitees
      cy.task('queryDatabaseMultiple', {
        table: 'invitees',
        column: 'invitation_id',
        value: '11111111-1111-1111-1111-111111111111'
      }).then((invitees) => {
        if (!Array.isArray(invitees)) {
          throw new Error('Invitees not found');
        }
        const john = invitees.find(inv => inv.first_name === 'John');
        const jane = invitees.find(inv => inv.first_name === 'Jane');

        // Verify invitees exist in database before checking their status
        if (!john || !jane) {
          throw new Error(`Invitees not found: John=${!!john}, Jane=${!!jane}`);
        }

        expect(john.coming).to.equal(true);
        expect(jane.coming).to.equal(false);
      });
    });

    it('should prevent accepting invitation without selecting any invitees', () => {
      // Accept invitation
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

      // Uncheck all invitees - none are coming
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').uncheck();
      cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').uncheck();

      // Try to submit
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Wait a moment for any async validation
      cy.wait(1000);

      // Validation should prevent submission - confirmation modal should NOT appear
      cy.get('body').should('not.contain', 'Confirm & Submit');

      // Should stay on form page (not redirect to success)
      cy.url().should('include', '/rsvp/TEST01');
      cy.url().should('not.include', '/success');

      // Now select one invitee to fix the validation error
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();

      // Now submission should work - confirmation modal should appear
      cy.get('button[type="submit"]').contains('Submit RSVP').click();
      cy.contains('Confirm & Submit', { timeout: 2000 }).should('be.visible');
    });
  });

  describe('RSVP Success Page', () => {
    it('should display success message after submission', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Quick submission - accept invitation
      cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });
      cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Confirm in modal
      cy.contains('Confirm & Submit').click();

      // Check success page with correct query parameters
      cy.url({ timeout: 10000 })
        .should('include', '/rsvp/success')
        .and('include', 'accepted=yes')
        .and('include', 'code=TEST01');
      cy.contains('Thank You!', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Direct Link Navigation', () => {
    it('should work when visiting RSVP form directly via link', () => {
      // Simulate clicking a link in invitation (direct to form)
      cy.visit('/rsvp/TEST01');

      // Should load form without going through code entry
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');
      cy.url().should('include', '/rsvp/TEST01');
    });

    it('should show error for non-existent RSVP code in direct link', () => {
      cy.visit('/rsvp/NOTEXIST', { failOnStatusCode: false });

      // Should show error or redirect
      // Adjust this based on actual error handling in the app
      cy.contains(/not found|invalid|error/i, { timeout: 5000 });
    });
  });
});

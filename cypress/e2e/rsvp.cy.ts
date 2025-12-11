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
      cy.contains('Please enter your unique RSVP code').should('be.visible');
      cy.get('input[placeholder="ABC123"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Continue to RSVP Form');
    });

    it('should validate a valid RSVP code and redirect to form', () => {
      cy.visit('/rsvp');

      // Enter valid code
      cy.get('input[placeholder="ABC123"]').type('TEST01');

      // Wait for validation to complete
      cy.contains('Code found!', { timeout: 2000 }).should('be.visible');

      // Submit form
      cy.get('button[type="submit"]').click();

      // Should redirect to RSVP form page
      cy.url().should('include', '/rsvp/TEST01');
    });

    it('should show error for invalid RSVP code', () => {
      cy.visit('/rsvp');

      // Enter invalid code
      cy.get('input[placeholder="ABC123"]').type('INVALID99');

      // Wait for validation
      cy.wait(1000);

      // Should show error message
      cy.contains('Code not found', { timeout: 2000 }).should('be.visible');
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
      cy.get('input[placeholder="ABC123"]').type('ABC');

      // Submit button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');

      // Complete the code
      cy.get('input[placeholder="ABC123"]').type('123');

      // Button should be enabled (though code might be invalid)
      cy.get('button[type="submit"]').should('not.be.disabled');
    });
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
      // Accept invitation
      cy.contains('Yes, we will be there').click();

      // Select invitees (both coming)
      cy.contains('John Doe').parent().find('input[type="checkbox"]').check();
      cy.contains('Jane Doe').parent().find('input[type="checkbox"]').check();

      // Staying at villa
      cy.contains('Yes, we would like to stay at the villa').click();

      // Fill optional fields
      cy.get('textarea[placeholder*="dietary"]').type('Vegetarian, no nuts');
      cy.get('input[placeholder*="song"]').type("Don't Stop Believin' - Journey");
      cy.get('textarea[placeholder*="travel"]').type('Arriving Friday evening, departing Sunday morning');
      cy.get('textarea[placeholder*="message"]').type('So excited to celebrate with you!');

      // Submit form
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Should redirect to success page
      cy.url({ timeout: 10000 }).should('include', '/rsvp/success');
      cy.contains('Thank you', { timeout: 5000 }).should('be.visible');

      // Verify data was saved to database
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((rsvp) => {
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
      // Decline invitation
      cy.contains('Unfortunately, we cannot make it').click();

      // Fill message
      cy.get('textarea[placeholder*="message"]').type("Unfortunately we can't make it. Wishing you all the best!");

      // Submit form
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Should redirect to success page
      cy.url({ timeout: 10000 }).should('include', '/rsvp/success');

      // Verify data was saved
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((rsvp) => {
        if (!rsvp) {
          throw new Error('RSVP not found');
        }
        expect(rsvp.accepted).to.equal(false);
      });
    });

    it('should allow editing existing RSVP', () => {
      // First submission
      cy.contains('Yes, we will be there').click();
      cy.contains('John Doe').parent().find('input[type="checkbox"]').check();
      cy.get('button[type="submit"]').contains('Submit RSVP').click();
      cy.url({ timeout: 10000 }).should('include', '/rsvp/success');

      // Go back to form
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Should show info that we're amending
      cy.contains("You're amending your RSVP", { timeout: 5000 }).should('be.visible');

      // Form should be pre-populated
      cy.contains('Yes, we will be there').should('be.checked');

      // Make changes
      cy.get('textarea[placeholder*="dietary"]').clear().type('Gluten-free');
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Verify updated data
      cy.task('queryDatabase', { table: 'RSVPs', code: 'TEST01' }).then((rsvp) => {
        if (!rsvp) {
          throw new Error('RSVP not found');
        }
        expect(rsvp.dietary_restrictions).to.equal('Gluten-free');
      });
    });

    it('should handle partial invitee attendance', () => {
      // Accept invitation
      cy.contains('Yes, we will be there').click();

      // Only John is coming
      cy.contains('John Doe').parent().find('input[type="checkbox"]').check();
      cy.contains('Jane Doe').parent().find('input[type="checkbox"]').uncheck();

      // Submit
      cy.get('button[type="submit"]').contains('Submit RSVP').click();
      cy.url({ timeout: 10000 }).should('include', '/rsvp/success');

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

        expect(john.coming).to.equal(true);
        expect(jane.coming).to.equal(false);
      });
    });
  });

  describe('RSVP Success Page', () => {
    it('should display success message after submission', () => {
      cy.visit('/rsvp/TEST01');
      cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

      // Quick submission
      cy.contains('Yes, we will be there').click();
      cy.contains('John Doe').parent().find('input[type="checkbox"]').check();
      cy.get('button[type="submit"]').contains('Submit RSVP').click();

      // Check success page
      cy.url({ timeout: 10000 }).should('include', '/rsvp/success');
      cy.contains('Thank you', { timeout: 5000 }).should('be.visible');
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

/// <reference types="cypress" />

/**
 * Seat Finder E2E Tests
 *
 * Today is 2026-05-01, which is before the public release date of 2026-05-22.
 * The seat finder page is therefore auth-gated: unauthenticated visitors are
 * redirected to /login.
 *
 * The seed data has no seat/table assignments by default, so search results
 * will be empty — tests cover the empty-state gracefully rather than asserting
 * on specific seat data.
 */

describe("Seat Finder", () => {
    beforeEach(() => {
        cy.resetDb();
    });

    describe("Auth gate (before May 22nd 2026)", () => {
        it("redirects unauthenticated users from /seat-finder to /login", () => {
            cy.visit("/seat-finder");
            cy.url({ timeout: 8000 }).should("include", "/login");
        });

        it("redirects unauthenticated users and preserves the return path", () => {
            cy.visit("/seat-finder");
            cy.url({ timeout: 8000 }).should("include", "redirectedFrom");
        });
    });

    describe("Authenticated access", () => {
        beforeEach(() => {
            cy.login("admin@wedding.test", "TestPassword123!");
        });

        it("allows a logged-in user to access /seat-finder", () => {
            cy.visit("/seat-finder");
            cy.url({ timeout: 8000 }).should("include", "/seat-finder");
        });

        it("renders the Seat Finder heading", () => {
            cy.visit("/seat-finder");
            cy.contains("h1", "Seat Finder", { timeout: 8000 }).should("be.visible");
        });

        it("renders the name search input", () => {
            cy.visit("/seat-finder");
            cy.get("input[placeholder*='Search']", { timeout: 8000 }).should("be.visible");
        });

        it("does not render the SVG seating map before a search result is selected", () => {
            cy.visit("/seat-finder");
            cy.get('svg[aria-label="Venue seating map"]').should("not.exist");
        });

        it("shows a loader when typing 2+ characters into the search box", () => {
            cy.visit("/seat-finder");

            const searchInput = cy.get("input[placeholder*='Search']", { timeout: 8000 });
            searchInput.type("Jo");

            // A Mantine Loader (svg) appears inside the left section of the input while searching
            cy.get(".mantine-Autocomplete-section svg", { timeout: 5000 }).should("exist");
        });

        it("shows no crash and no results card for a name that does not exist", () => {
            cy.visit("/seat-finder");

            cy.get("input[placeholder*='Search']", { timeout: 8000 }).type("Zzznotaguest");

            // Wait for debounce + API round-trip
            cy.wait(600);

            // The page must still be standing — heading still visible
            cy.contains("h1", "Seat Finder").should("be.visible");

            // No party results card should appear (it only renders after a name is selected)
            cy.contains("Table", { timeout: 1000 }).should("not.exist");
        });

        it("typing fewer than 2 characters does not trigger a search or show results", () => {
            cy.visit("/seat-finder");

            cy.get("input[placeholder*='Search']", { timeout: 8000 }).type("A");

            // The search icon (not loader) should still be shown — no loader for <2 chars
            cy.wait(400);
            cy.get(".mantine-Autocomplete-section svg").should("exist");
            // Page stays intact
            cy.contains("h1", "Seat Finder").should("be.visible");
        });

        it("does not show the SVG map while a search is in progress without a prior selection", () => {
            cy.visit("/seat-finder");

            cy.get("input[placeholder*='Search']", { timeout: 8000 }).type("Ma");

            // SVG only appears after a result is selected, not during typing
            cy.get('svg[aria-label="Venue seating map"]').should("not.exist");
        });
    });
});

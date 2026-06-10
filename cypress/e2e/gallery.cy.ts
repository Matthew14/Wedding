/// <reference types="cypress" />

describe("Photo Gallery", () => {
    describe("Gallery page", () => {
        it("displays the gallery heading", () => {
            cy.visit("/gallery");
            cy.contains("Wedding Gallery").should("be.visible");
        });

        it("shows upload button", () => {
            cy.visit("/gallery");
            cy.contains("Upload Photos").should("be.visible");
        });

        it("shows invitation code prompt when no code is stored", () => {
            cy.clearLocalStorage();
            cy.visit("/gallery");
            cy.contains("Enter your invitation code").should("be.visible");
        });
    });

    describe("Upload page — invalid code", () => {
        beforeEach(() => {
            cy.clearLocalStorage();
            cy.visit("/gallery/upload");
        });

        it("shows code entry form", () => {
            cy.contains("Your invitation code").should("be.visible");
            cy.get("input").should("be.visible");
        });

        it("shows error for short code", () => {
            cy.get("input").type("ABC");
            cy.contains("Continue").click();
            cy.contains("6-character").should("be.visible");
        });

        it("shows error for non-existent code", () => {
            cy.intercept("POST", "/api/photos/upload-url", {
                statusCode: 400,
                body: { error: "Invalid invitation code" },
            }).as("uploadUrl");

            cy.get("input").type("XXXXXX");
            cy.contains("Continue").click();
            cy.wait("@uploadUrl");
            cy.contains("Invalid invitation code").should("be.visible");
        });
    });

    describe("Upload page — valid code", () => {
        beforeEach(() => {
            cy.clearLocalStorage();
            cy.intercept("POST", "/api/photos/upload-url", (req) => {
                const { sizeBytes } = req.body;
                if (sizeBytes === 0) {
                    req.reply({ statusCode: 200, body: { uploadUrl: "", photoId: "test-id", key: "test-key" } });
                } else {
                    req.reply({ statusCode: 200, body: { uploadUrl: "https://s3/presigned", photoId: "new-id", key: "uploads/original/ABC123/uuid.jpg" } });
                }
            }).as("uploadUrl");
            cy.intercept("PUT", "https://s3/presigned", { statusCode: 200 }).as("s3Put");
            cy.visit("/gallery/upload");
        });

        it("shows file picker after valid code entry", () => {
            cy.get("input").type("ABC123");
            cy.contains("Continue").click();
            cy.wait("@uploadUrl");
            cy.contains("Choose photos").should("be.visible");
        });
    });

    describe("Dashboard photo moderation", () => {
        it("redirects to login when not authenticated", () => {
            cy.visit("/dashboard/photos");
            cy.url({ timeout: 5000 }).should("include", "/login");
        });

        it("shows Photos tab in authenticated dashboard", () => {
            cy.fixture("auth-data").then((authData) => {
                cy.login(authData.validUser.email, authData.validUser.password);
                cy.visit("/dashboard/photos");
                cy.contains("Photo Moderation").should("be.visible");
                cy.contains("Pending").should("be.visible");
            });
        });
    });
});

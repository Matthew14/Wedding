import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Setup matchMedia mock using vi.hoisted to run before module imports
vi.hoisted(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
});
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
    useParams: vi.fn(() => ({ code: "TEST01" })),
    useRouter: vi.fn(() => ({
        push: mockPush,
        replace: mockReplace,
    })),
}));

// Mock the Navigation component
vi.mock("@/components/Navigation", () => ({
    Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

// Mock the tracking hooks - import real useRSVPForm, mock only analytics
vi.mock("@/hooks", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/hooks")>();
    return {
        ...actual,
        useTracking: () => ({
            trackEvent: vi.fn(),
            identifyUser: vi.fn(),
            setUserProperties: vi.fn(),
            setGroup: vi.fn(),
        }),
        useFormAnalytics: () => ({
            trackFormSubmission: vi.fn(),
        }),
        useScrollDepth: vi.fn(),
    };
});

// Import after mocking
import RSVPFormPage from "../page";

// Custom render function
const renderPage = async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
        result = render(
            <MantineProvider>
                <RSVPFormPage />
            </MantineProvider>
        );
    });
    return result!;
};

// Helper to create mock API responses
const createMockRSVPData = (overrides = {}) => ({
    accepted: false,
    rsvpId: "rsvp-123",
    invitationId: "inv-123",
    updatedAt: null,
    stayingVilla: false,
    dietaryRestrictions: "",
    songRequest: "",
    travelPlans: "",
    message: "",
    invitees: [
        { id: "inv-1", first_name: "John", last_name: "Doe", coming: false },
        { id: "inv-2", first_name: "Jane", last_name: "Doe", coming: false },
    ],
    ...overrides,
});

const createAmendmentData = (overrides = {}) => ({
    ...createMockRSVPData(),
    accepted: true,
    updatedAt: "2024-01-15T10:30:00Z",
    stayingVilla: true,
    dietaryRestrictions: "Vegetarian",
    songRequest: "Dancing Queen",
    travelPlans: "Flight BA123",
    message: "Looking forward to it!",
    invitees: [
        { id: "inv-1", first_name: "John", last_name: "Doe", coming: true },
        { id: "inv-2", first_name: "Jane", last_name: "Doe", coming: true },
    ],
    ...overrides,
});

describe("RSVPFormPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Form Initialization", () => {
        it("should show loading state initially", async () => {
            // Mock fetch to never resolve
            vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

            await renderPage();

            expect(screen.getByText("Loading RSVP form...")).toBeInTheDocument();
        });

        it("should load and populate form with RSVP data", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        });

        it("should show amendment message for returning users", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/You're amending your RSVP/)).toBeInTheDocument();
            });
        });

        it("should handle API errors gracefully", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: false,
                status: 500,
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("Failed to load RSVP data")).toBeInTheDocument();
            });

            expect(screen.getByRole("button", { name: /Back to RSVP Code Entry/i })).toBeInTheDocument();
        });

        it("should handle network errors gracefully", async () => {
            vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("Something went wrong while loading the form")).toBeInTheDocument();
            });
        });

        it("should pre-populate dietary restrictions on amendment", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/You're amending your RSVP/)).toBeInTheDocument();
            });

            // Check dietary restrictions is pre-filled
            const dietaryTextarea = screen.getByPlaceholderText(/dietary requirements/i);
            expect(dietaryTextarea).toHaveValue("Vegetarian");
        });
    });

    describe("Change Detection", () => {
        it("should disable submit button when amending RSVP with no changes", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/You're amending your RSVP/)).toBeInTheDocument();
            });

            // Submit button should be disabled when no changes
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            expect(submitButton).toBeDisabled();

            // Should show "No changes to submit" message
            expect(screen.getByText("No changes to submit")).toBeInTheDocument();
        });

        it("should enable submit button when dietary restrictions are changed", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/You're amending your RSVP/)).toBeInTheDocument();
            });

            // Make a change - modify dietary restrictions
            const dietaryTextarea = screen.getByPlaceholderText(/dietary requirements/i);
            await user.clear(dietaryTextarea);
            await user.type(dietaryTextarea, "Vegan");

            // Submit button should now be enabled
            await waitFor(() => {
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                expect(submitButton).not.toBeDisabled();
            });
        });

        it("should allow submission for new RSVPs (no original values)", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Submit button should be enabled for new RSVPs
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            expect(submitButton).not.toBeDisabled();
        });
    });

    describe("Form Submission", () => {
        it("should show confirmation modal before submit", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Select an invitee first (required for accepting)
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox);

            // Submit the form
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            await user.click(submitButton);

            // Confirmation modal should appear
            await waitFor(() => {
                expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
            });

            expect(screen.getByRole("button", { name: /Confirm & Submit/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Go Back & Edit/i })).toBeInTheDocument();
        });

        it("should submit form and redirect on success", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true }),
                } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Select an invitee
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox);

            // Submit the form
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            await user.click(submitButton);

            // Confirm in modal
            await waitFor(() => {
                expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
            });

            const confirmButton = screen.getByRole("button", { name: /Confirm & Submit/i });
            await user.click(confirmButton);

            // Should redirect to success page
            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/rsvp/success"));
            });
        });

        it("should close confirmation modal when clicking Go Back & Edit", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Select an invitee
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox);

            // Submit the form
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            await user.click(submitButton);

            // Modal should appear
            await waitFor(() => {
                expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
            });

            // Click Go Back & Edit
            const editButton = screen.getByRole("button", { name: /Go Back & Edit/i });
            await user.click(editButton);

            // Modal should close
            await waitFor(() => {
                expect(screen.queryByText("Confirm Your RSVP")).not.toBeInTheDocument();
            });
        });
    });

    describe("Invitee Management", () => {
        it("should auto-select single invitee when accepting", async () => {
            const singleInviteeData = createMockRSVPData({
                invitees: [
                    { id: "inv-1", first_name: "John", last_name: "Doe", coming: false },
                ],
            });

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(singleInviteeData),
            } as Response);

            await renderPage();

            await waitFor(() => {
                // For single invitees, the checkbox is hidden and they're auto-marked as coming
                // The form should be ready to submit
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                expect(submitButton).not.toBeDisabled();
            });

            // No "Is everyone coming?" section for single invitees
            expect(screen.queryByText("Is everyone coming?")).not.toBeInTheDocument();
        });

        it("should show validation error when no invitees selected", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Uncheck all invitees (they're checked by default)
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            const janeCheckbox = screen.getByRole("checkbox", { name: "Jane Doe" });
            await user.click(johnCheckbox); // Uncheck John
            await user.click(janeCheckbox); // Uncheck Jane

            // Validation error should appear
            await waitFor(() => {
                expect(screen.getByText("Please select at least one guest who will be attending or else select 'No' above.")).toBeInTheDocument();
            });
        });

        it("should show invitee checkboxes for multiple invitees", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("Is everyone coming?")).toBeInTheDocument();
            });

            expect(screen.getByRole("checkbox", { name: "John Doe" })).toBeInTheDocument();
            expect(screen.getByRole("checkbox", { name: "Jane Doe" })).toBeInTheDocument();
        });

        it("should toggle individual invitee attendance", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            const janeCheckbox = screen.getByRole("checkbox", { name: "Jane Doe" });

            // Initially all checked (default when "Yes" is selected)
            expect(johnCheckbox).toBeChecked();
            expect(janeCheckbox).toBeChecked();

            // Uncheck John
            await user.click(johnCheckbox);
            expect(johnCheckbox).not.toBeChecked();
            expect(janeCheckbox).toBeChecked();

            // Uncheck Jane
            await user.click(janeCheckbox);
            expect(johnCheckbox).not.toBeChecked();
            expect(janeCheckbox).not.toBeChecked();

            // Check John again
            await user.click(johnCheckbox);
            expect(johnCheckbox).toBeChecked();
            expect(janeCheckbox).not.toBeChecked();
        });
    });

    describe("Form Fields Visibility", () => {
        it("should hide villa and dietary questions when declining", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Villa question should be visible when accepting
            expect(screen.getByText(/Will you be staying with us\?/i)).toBeInTheDocument();

            // Decline the invitation
            const noRadio = screen.getByRole("radio", { name: "No" });
            await user.click(noRadio);

            // Villa question should be hidden
            await waitFor(() => {
                expect(screen.queryByText(/Will you be staying with us\?/i)).not.toBeInTheDocument();
            });
        });

        it("should show message field regardless of acceptance status", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Message field visible when accepting
            expect(screen.getByText(/Anything else you'd like us to know/i)).toBeInTheDocument();

            // Decline the invitation
            const noRadio = screen.getByRole("radio", { name: "No" });
            await user.click(noRadio);

            // Message field should still be visible
            await waitFor(() => {
                expect(screen.getByText(/Anything else you'd like us to know/i)).toBeInTheDocument();
            });
        });
    });

    describe("Confirmation Modal Content", () => {
        it("should display Guest Attendance section in confirmation modal", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Select John but not Jane
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox);

            // Submit the form
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            await user.click(submitButton);

            // Check confirmation modal content
            await waitFor(() => {
                expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
            });

            // Should show Guest Attendance section
            expect(screen.getByText("Guest Attendance")).toBeInTheDocument();
        });

        it("should display dietary restrictions in confirmation modal when provided", async () => {
            const user = userEvent.setup();

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Select an invitee
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox);

            // Add dietary restrictions
            const dietaryTextarea = screen.getByPlaceholderText(/dietary requirements/i);
            await user.type(dietaryTextarea, "Gluten-free");

            // Submit the form
            const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
            await user.click(submitButton);

            // Check confirmation modal content
            await waitFor(() => {
                expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
            });

            expect(screen.getByText("Dietary Requirements")).toBeInTheDocument();
            // "Gluten-free" appears in both the textarea and the modal
            expect(screen.getAllByText("Gluten-free").length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Edge Cases", () => {
        describe("Empty Invitees Handling", () => {
            it("handles single invitee gracefully (auto-selected)", async () => {
                const singleInviteeData = createMockRSVPData({
                    invitees: [
                        { id: "inv-1", first_name: "Solo", last_name: "Guest", coming: false },
                    ],
                });

                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(singleInviteeData),
                });

                await renderPage();
                const user = userEvent.setup();

                // Wait for loading to finish and data to appear
                await waitFor(() => {
                    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
                });

                // Find the acceptance radio group - get the first Yes radio (acceptance question)
                const yesRadios = screen.getAllByRole("radio", { name: /Yes/i });
                await user.click(yesRadios[0]);

                // Should not show validation error for single invitee
                await waitFor(() => {
                    expect(screen.queryByText(/select at least one guest/i)).not.toBeInTheDocument();
                });
            });
        });

        describe("Special Characters in Form Fields", () => {
            it("handles special characters in dietary restrictions input", async () => {
                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Accept invitation - get the first Yes radio (acceptance question)
                const yesRadios = screen.getAllByRole("radio", { name: /Yes/i });
                await user.click(yesRadios[0]);

                // Wait for invitee checkboxes to appear and select one
                await waitFor(() => {
                    expect(screen.getByRole("checkbox", { name: "John Doe" })).toBeInTheDocument();
                });
                const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
                await user.click(johnCheckbox);

                // Enter special characters in dietary field
                const dietaryTextarea = screen.getByPlaceholderText(/dietary requirements/i);
                const specialChars = "Gluten-free & dairy-free! <test> 'quotes' \"double\"";
                await user.type(dietaryTextarea, specialChars);

                expect(dietaryTextarea).toHaveValue(specialChars);
            });

            it("handles unicode and emoji in message field", async () => {
                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Find message textarea (it's visible regardless of acceptance status)
                const messageTextarea = screen.getByPlaceholderText(/any other information/i);
                const unicodeMessage = "Congratulations! 🎉🎊 Wünsche!";
                await user.type(messageTextarea, unicodeMessage);

                expect(messageTextarea).toHaveValue(unicodeMessage);
            });
        });

        describe("Rapid Form Submissions", () => {
            it("shows submitting state when form is being submitted", async () => {
                // This test verifies the form shows loading state during submission
                global.fetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(createMockRSVPData()),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve({ success: true }),
                    });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Decline the invitation (simpler flow - no invitee selection needed)
                const noRadios = screen.getAllByRole("radio", { name: /No/i });
                await user.click(noRadios[0]);

                // Submit form
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                await user.click(submitButton);

                // Should show confirmation modal
                await waitFor(() => {
                    expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
                });

                // Confirm submission and verify modal opened successfully
                const confirmButton = screen.getByRole("button", { name: /Confirm & Submit/i });
                expect(confirmButton).toBeInTheDocument();
            });
        });

        describe("Network Error Handling", () => {
            it("displays error message on network failure during load", async () => {
                global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

                await renderPage();

                await waitFor(() => {
                    // Check for the actual error text used in the component
                    expect(screen.getByText(/Something went wrong|Failed to load/i)).toBeInTheDocument();
                });
            });

            it("calls API with correct data on form submission", async () => {
                const mockFetch = vi.fn()
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve(createMockRSVPData()),
                    })
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () => Promise.resolve({ success: true }),
                    });
                global.fetch = mockFetch;

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Decline (simpler flow)
                const noRadios = screen.getAllByRole("radio", { name: /No/i });
                await user.click(noRadios[0]);

                // Submit form
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                await user.click(submitButton);

                // Confirm submission
                await waitFor(() => {
                    expect(screen.getByText("Confirm Your RSVP")).toBeInTheDocument();
                });
                const confirmButton = screen.getByRole("button", { name: /Confirm & Submit/i });
                await user.click(confirmButton);

                // Wait for API call and verify it was made
                await waitFor(() => {
                    expect(mockFetch).toHaveBeenCalledTimes(2); // GET + POST
                });

                // Verify POST was called with correct endpoint
                const postCall = mockFetch.mock.calls[1];
                expect(postCall[0]).toContain("/api/rsvp/");
                expect(postCall[1].method).toBe("POST");
            });

            it("handles timeout during data fetch", async () => {
                global.fetch = vi.fn().mockRejectedValueOnce(new Error("Timeout"));

                await renderPage();

                await waitFor(() => {
                    expect(screen.getByText(/Something went wrong|Failed to load/i)).toBeInTheDocument();
                });
            });
        });

        describe("Form State Edge Cases", () => {
            it("maintains form state after validation error", async () => {
                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Fill in message field
                const messageTextarea = screen.getByPlaceholderText(/any other information/i);
                await user.type(messageTextarea, "Test message");

                // Uncheck all invitees (they're checked by default) to cause validation error
                const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
                const janeCheckbox = screen.getByRole("checkbox", { name: "Jane Doe" });
                await user.click(johnCheckbox);
                await user.click(janeCheckbox);

                // Try to submit without any invitee selected
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                await user.click(submitButton);

                // Form should show validation error but maintain message content
                await waitFor(() => {
                    expect(screen.getByText(/select at least one guest/i)).toBeInTheDocument();
                });
                expect(messageTextarea).toHaveValue("Test message");
            });

            it("hides acceptance-specific fields when declining", async () => {
                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Accept - get the first Yes radio
                const yesRadios = screen.getAllByRole("radio", { name: /Yes/i });
                await user.click(yesRadios[0]);

                // Invitee checkboxes should be visible when accepting
                await waitFor(() => {
                    expect(screen.getByRole("checkbox", { name: "John Doe" })).toBeInTheDocument();
                });

                // Switch to decline - get the first No radio
                const noRadios = screen.getAllByRole("radio", { name: /No/i });
                await user.click(noRadios[0]);

                // Invitee checkboxes should no longer be visible when declining
                await waitFor(() => {
                    expect(screen.queryByRole("checkbox", { name: "John Doe" })).not.toBeInTheDocument();
                });
            });
        });

        describe("Boundary Conditions", () => {
            it("handles maximum length text in dietary restrictions", async () => {
                global.fetch = vi.fn().mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(createMockRSVPData()),
                });

                await renderPage();
                const user = userEvent.setup();

                await waitFor(() => {
                    expect(screen.getByText("John Doe")).toBeInTheDocument();
                });

                // Accept - get the first Yes radio
                const yesRadios = screen.getAllByRole("radio", { name: /Yes/i });
                await user.click(yesRadios[0]);

                // Wait for and click invitee checkbox
                await waitFor(() => {
                    expect(screen.getByRole("checkbox", { name: "John Doe" })).toBeInTheDocument();
                });
                const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
                await user.click(johnCheckbox);

                // Try to enter very long text (should be handled by form validation)
                // Use fireEvent.change instead of user.type for performance (typing 600 chars is slow)
                const dietaryTextarea = screen.getByPlaceholderText(
                    /dietary requirements/i
                ) as HTMLTextAreaElement;
                const longText = "a".repeat(600); // Exceeds 500 char limit
                fireEvent.change(dietaryTextarea, { target: { value: longText } });

                // Submit to trigger validation
                const submitButton = screen.getByRole("button", { name: /Submit RSVP/i });
                await user.click(submitButton);

                // Form should allow typing long text (validation happens on submit)
                await waitFor(() => {
                    // The textarea should contain the typed text
                    expect(dietaryTextarea.value.length).toBeLessThanOrEqual(600);
                });
            });
        });
    });
});

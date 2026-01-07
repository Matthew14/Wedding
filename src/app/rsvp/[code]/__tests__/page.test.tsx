import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// Setup matchMedia mock before anything else
beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

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

// Mock the tracking hooks - need to use factory function to avoid hoisting issues
vi.mock("@/hooks", async () => {
    const mantineForm = await import("@mantine/form");
    return {
        useRSVPForm: () => mantineForm.useForm({
            initialValues: {
                accepted: true,
                invitees: [],
                staying_villa: "yes",
                dietary_restrictions: "",
                song_request: "",
                travel_plans: "",
                message: "",
            },
            validate: {
                accepted: (value: boolean | undefined) => (value === undefined ? "Please select whether you're coming" : null),
                invitees: (value: { id: string; name: string; coming: boolean }[], values: { accepted: boolean }) => {
                    if (values.accepted === true) {
                        if (value?.length === 1) return null;
                        const anyoneComing = value?.some(inv => inv.coming);
                        if (!anyoneComing) {
                            return "Please select at least one guest who will be attending";
                        }
                    }
                    return null;
                },
                staying_villa: (value: string | undefined) => (value === undefined ? "Please select accommodation preference" : null),
                dietary_restrictions: (value: string | undefined) => (value && value.length > 500 ? "Too long" : null),
                song_request: (value: string | undefined) => (value && value.length > 200 ? "Too long" : null),
                travel_plans: (value: string | undefined) => (value && value.length > 500 ? "Too long" : null),
                message: (value: string | undefined) => (value && value.length > 1000 ? "Too long" : null),
            },
        }),
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
        RSVPEvents: {
            FORM_VIEWED: "rsvp_form_viewed",
            FORM_AMENDMENT: "rsvp_form_amendment",
            FORM_LOAD_ERROR: "rsvp_form_load_error",
            SUBMIT_ATTEMPT: "rsvp_submit_attempt",
            SUBMIT_SUCCESS: "rsvp_submit_success",
            SUBMIT_ERROR: "rsvp_submit_error",
            ACCEPTANCE_CHANGED: "rsvp_acceptance_changed",
            INVITEE_TOGGLED: "rsvp_invitee_toggled",
            VILLA_CHANGED: "rsvp_villa_changed",
            DIETARY_FILLED: "rsvp_dietary_filled",
            SONG_FILLED: "rsvp_song_filled",
            TRAVEL_FILLED: "rsvp_travel_filled",
            MESSAGE_FILLED: "rsvp_message_filled",
            CONFIRMATION_OPENED: "rsvp_confirmation_opened",
            CONFIRMATION_EDITED: "rsvp_confirmation_edited",
        },
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

            // Check and uncheck to trigger validation
            const johnCheckbox = screen.getByRole("checkbox", { name: "John Doe" });
            await user.click(johnCheckbox); // Check
            await user.click(johnCheckbox); // Uncheck

            // Validation error should appear
            await waitFor(() => {
                expect(screen.getByText("Please select at least one guest who will be attending")).toBeInTheDocument();
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

            // Initially unchecked
            expect(johnCheckbox).not.toBeChecked();
            expect(janeCheckbox).not.toBeChecked();

            // Check John
            await user.click(johnCheckbox);
            expect(johnCheckbox).toBeChecked();
            expect(janeCheckbox).not.toBeChecked();

            // Check Jane
            await user.click(janeCheckbox);
            expect(johnCheckbox).toBeChecked();
            expect(janeCheckbox).toBeChecked();

            // Uncheck John
            await user.click(johnCheckbox);
            expect(johnCheckbox).not.toBeChecked();
            expect(janeCheckbox).toBeChecked();
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
            expect(screen.getByText(/Will you be staying with us at Gran Villa Rosa/i)).toBeInTheDocument();

            // Decline the invitation
            const noRadio = screen.getByRole("radio", { name: "No" });
            await user.click(noRadio);

            // Villa question should be hidden
            await waitFor(() => {
                expect(screen.queryByText(/Will you be staying with us at Gran Villa Rosa/i)).not.toBeInTheDocument();
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
            expect(screen.getByText("Gluten-free")).toBeInTheDocument();
        });
    });
});

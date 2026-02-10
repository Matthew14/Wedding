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
import { render, screen, waitFor, act } from "@testing-library/react";
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

// Mock the RSVP deadline utility - default to closed (after deadline)
const mockIsRSVPClosed = vi.fn(() => true);
vi.mock("@/utils/rsvpDeadline", () => ({
    isRSVPClosed: () => mockIsRSVPClosed(),
}));

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
        mockIsRSVPClosed.mockReturnValue(true);
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

        it("should show disabled banner instead of amendment message for returning users", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/deadline for amending your RSVP has now passed/)).toBeInTheDocument();
            });

            // Should not show the old amendment message
            expect(screen.queryByText(/You're amending your RSVP/)).not.toBeInTheDocument();
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
                expect(screen.getByText(/deadline for amending your RSVP has now passed/)).toBeInTheDocument();
            });

            // Check dietary restrictions is pre-filled
            const dietaryTextarea = screen.getByPlaceholderText(/dietary requirements/i);
            expect(dietaryTextarea).toHaveValue("Vegetarian");
        });
    });

    describe("Disabled State", () => {
        it("should show disabled info banner for new visitors", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText(/deadline for amending your RSVP has now passed/)).toBeInTheDocument();
            });

            expect(screen.getByText(/please contact us directly/)).toBeInTheDocument();
        });

        it("should not render submit button", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            expect(screen.queryByRole("button", { name: /Submit RSVP/i })).not.toBeInTheDocument();
        });

        it("should not show 'No changes to submit' message", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            expect(screen.queryByText("No changes to submit")).not.toBeInTheDocument();
        });

        it("should render disabled text inputs", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createMockRSVPData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
            });

            // Message textarea is always visible and should be disabled
            expect(screen.getByPlaceholderText(/any other information/i)).toBeDisabled();
        });

        it("should render all text inputs as disabled for accepted RSVP", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/dietary requirements/i)).toBeInTheDocument();
            });

            expect(screen.getByPlaceholderText(/dietary requirements/i)).toBeDisabled();
            expect(screen.getByPlaceholderText(/song/i)).toBeDisabled();
            expect(screen.getByPlaceholderText(/travel/i)).toBeDisabled();
            expect(screen.getByPlaceholderText(/any other information/i)).toBeDisabled();
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

        it("should display pre-filled amendment data as read-only", async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createAmendmentData()),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/dietary requirements/i)).toHaveValue("Vegetarian");
            });

            expect(screen.getByPlaceholderText(/song/i)).toHaveValue("Dancing Queen");
            expect(screen.getByPlaceholderText(/travel/i)).toHaveValue("Flight BA123");
            expect(screen.getByPlaceholderText(/any other information/i)).toHaveValue("Looking forward to it!");
        });

        it("should not show 'Is everyone coming?' for single invitees", async () => {
            const singleInviteeData = createMockRSVPData({
                invitees: [
                    { id: "inv-1", first_name: "Solo", last_name: "Guest", coming: false },
                ],
            });

            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(singleInviteeData),
            } as Response);

            await renderPage();

            await waitFor(() => {
                expect(screen.queryByText("Loading")).not.toBeInTheDocument();
            });

            expect(screen.queryByText("Is everyone coming?")).not.toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        describe("Network Error Handling", () => {
            it("displays error message on network failure during load", async () => {
                global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

                await renderPage();

                await waitFor(() => {
                    // Check for the actual error text used in the component
                    expect(screen.getByText(/Something went wrong|Failed to load/i)).toBeInTheDocument();
                });
            });

            it("handles timeout during data fetch", async () => {
                global.fetch = vi.fn().mockRejectedValueOnce(new Error("Timeout"));

                await renderPage();

                await waitFor(() => {
                    expect(screen.getByText(/Something went wrong|Failed to load/i)).toBeInTheDocument();
                });
            });
        });
    });
});

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
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({
        push: mockPush,
    })),
}));

// Mock the Navigation component
vi.mock("@/components/Navigation", () => ({
    Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

// Mock the tracking hooks
const mockTrackEvent = vi.fn();
vi.mock("@/hooks", () => ({
    useTracking: () => ({
        trackEvent: mockTrackEvent,
    }),
    InvitationEvents: {
        PAGE_VIEWED: "invitation_page_viewed",
        INVALID_LINK: "invitation_invalid_link",
        RSVP_CLICKED: "invitation_rsvp_clicked",
    },
}));

// Import after mocking
import InvitationContent from "../InvitationContent";

// Custom render function
const renderComponent = async (slug: string) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
        result = render(
            <MantineProvider>
                <InvitationContent slug={slug} />
            </MantineProvider>
        );
    });
    return result!;
};

// Helper to create mock API response
const createMockInvitationData = (overrides = {}) => ({
    valid: true,
    code: "TEST01",
    guestNames: ["John", "Jane"],
    invitationId: "inv-123",
    ...overrides,
});

describe("InvitationContent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Loading State", () => {
        it("shows loading state initially", async () => {
            // Never resolve the fetch to keep loading state
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(() => {})
            );

            await renderComponent("john-jane-TEST01");

            expect(screen.getByText("Loading your invitation...")).toBeInTheDocument();
        });
    });

    describe("Success State", () => {
        it("renders invitation details when API returns valid data", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData(),
            });

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(screen.getByText("Rebecca & Matthew")).toBeInTheDocument();
            });

            expect(screen.getByText("Wish to invite")).toBeInTheDocument();
            expect(screen.getByText("John & Jane")).toBeInTheDocument();
            expect(screen.getByText("to join them to celebrate their marriage")).toBeInTheDocument();
            expect(screen.getByText("View your RSVP")).toBeInTheDocument();
        });

        it("formats single guest name correctly", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData({ guestNames: ["Alice"] }),
            });

            await renderComponent("alice-TEST02");

            await waitFor(() => {
                expect(screen.getByText("Alice")).toBeInTheDocument();
            });
        });

        it("formats 3 guest names correctly", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () =>
                    createMockInvitationData({ guestNames: ["Michael", "Sarah", "Emma"] }),
            });

            await renderComponent("michael-sarah-emma-TEST03");

            await waitFor(() => {
                expect(screen.getByText("Michael, Sarah & Emma")).toBeInTheDocument();
            });
        });

        it("formats 4 guest names correctly", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () =>
                    createMockInvitationData({
                        guestNames: ["James", "Sarah", "Tom", "Lucy"],
                    }),
            });

            await renderComponent("james-sarah-tom-lucy-TEST04");

            await waitFor(() => {
                expect(screen.getByText("James, Sarah, Tom & Lucy")).toBeInTheDocument();
            });
        });

        it("displays invitation code", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData({ code: "ABC123" }),
            });

            await renderComponent("john-jane-ABC123");

            await waitFor(() => {
                expect(screen.getByText("ABC123")).toBeInTheDocument();
            });
        });

        it("tracks page view event on successful load", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData(),
            });

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(mockTrackEvent).toHaveBeenCalledWith("invitation_page_viewed", {
                    code: "TEST01",
                    guest_count: 2,
                });
            });
        });
    });

    describe("Error State", () => {
        it("renders error state when API returns 404", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            await renderComponent("invalid-BADCOD");

            await waitFor(() => {
                expect(screen.getByText("Invitation Not Found")).toBeInTheDocument();
            });

            expect(
                screen.getByText(/We couldn't find this invitation/)
            ).toBeInTheDocument();
            expect(screen.getByText("Go to RSVP Page")).toBeInTheDocument();
        });

        it("renders error state when fetch fails", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error("Network error")
            );

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(screen.getByText("Invitation Not Found")).toBeInTheDocument();
            });
        });

        it("renders error state for missing slug", async () => {
            await renderComponent("");

            await waitFor(() => {
                expect(screen.getByText("Invitation Not Found")).toBeInTheDocument();
            });

            expect(mockTrackEvent).toHaveBeenCalledWith("invitation_invalid_link", {
                reason: "missing_slug",
            });
        });

        it("tracks invalid link event on error", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            await renderComponent("invalid-BADCOD");

            await waitFor(() => {
                expect(mockTrackEvent).toHaveBeenCalledWith("invitation_invalid_link", {
                    reason: "invalid_code_or_names",
                });
            });
        });
    });

    describe("RSVP Button Navigation", () => {
        it("navigates to RSVP page when button is clicked", async () => {
            const user = userEvent.setup();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData({ code: "TEST01" }),
            });

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(screen.getByText("View your RSVP")).toBeInTheDocument();
            });

            await user.click(screen.getByText("View your RSVP"));

            expect(mockPush).toHaveBeenCalledWith("/rsvp/TEST01");
        });

        it("tracks RSVP clicked event", async () => {
            const user = userEvent.setup();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData({ code: "TEST01" }),
            });

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(screen.getByText("View your RSVP")).toBeInTheDocument();
            });

            await user.click(screen.getByText("View your RSVP"));

            expect(mockTrackEvent).toHaveBeenCalledWith("invitation_rsvp_clicked", {
                code: "TEST01",
            });
        });

        it("navigates to RSVP page from error state", async () => {
            const user = userEvent.setup();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            await renderComponent("invalid-BADCOD");

            await waitFor(() => {
                expect(screen.getByText("Go to RSVP Page")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Go to RSVP Page"));

            expect(mockPush).toHaveBeenCalledWith("/rsvp");
        });
    });

    describe("API Request", () => {
        it("calls API with correct slug", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => createMockInvitationData(),
            });

            await renderComponent("john-jane-TEST01");

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/invitation/john-jane-TEST01",
                    expect.objectContaining({
                        signal: expect.any(AbortSignal),
                    })
                );
            });
        });

        it("aborts request on unmount", async () => {
            let abortSignal: AbortSignal | undefined;

            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
                (_url: string, options?: { signal?: AbortSignal }) => {
                    abortSignal = options?.signal;
                    return new Promise(() => {}); // Never resolves
                }
            );

            const { unmount } = await renderComponent("john-jane-TEST01");

            expect(abortSignal?.aborted).toBe(false);

            unmount();

            expect(abortSignal?.aborted).toBe(true);
        });
    });
});

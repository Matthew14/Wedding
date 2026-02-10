import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

// Helper to create a fully chained mock that returns itself for all methods
// The chain always returns itself except for terminal methods (single, then)
function createMockChain(finalResult: { data: unknown; error: unknown } = { data: null, error: null }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};

    const returnChain = () => chain;

    chain.select = vi.fn().mockImplementation(returnChain);
    chain.insert = vi.fn().mockImplementation(returnChain);
    chain.update = vi.fn().mockImplementation(returnChain);
    chain.delete = vi.fn().mockImplementation(returnChain);
    chain.eq = vi.fn().mockImplementation(returnChain);
    chain.order = vi.fn().mockImplementation(returnChain);
    chain.single = vi.fn().mockResolvedValue(finalResult);

    // Make the chain itself thenable for queries that don't use .single()
    Object.assign(chain, {
        then: (resolve: (value: unknown) => void) => resolve(finalResult),
    });

    return chain;
}

// Mock Supabase
const mockSupabaseClient = {
    from: vi.fn(),
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock rate limiting to always allow requests in tests
vi.mock("@/utils/api/rateLimit", () => ({
    checkRateLimit: vi.fn(() => ({
        success: true,
        limit: 20,
        remaining: 19,
        resetTime: Date.now() + 60000,
    })),
    rateLimitedResponse: vi.fn(),
    addRateLimitHeaders: vi.fn((response) => response),
    RATE_LIMITS: {
        RSVP_SUBMIT: { limit: 20, windowSeconds: 60, keyPrefix: "rsvp-submit" },
        RSVP_VALIDATE: { limit: 5, windowSeconds: 60, keyPrefix: "rsvp-validate" },
        INVITATION: { limit: 30, windowSeconds: 60, keyPrefix: "invitation" },
        GENERAL: { limit: 60, windowSeconds: 60, keyPrefix: "general" },
    },
}));

// Mock the RSVP deadline utility
const mockIsRSVPClosed = vi.fn(() => false);
vi.mock("@/utils/rsvpDeadline", () => ({
    isRSVPClosed: () => mockIsRSVPClosed(),
}));

describe("/api/rsvp/[code]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsRSVPClosed.mockReturnValue(false);
    });

    describe("GET /api/rsvp/[code]", () => {
        it("returns 400 for invalid code format", async () => {
            const request = new NextRequest("http://localhost:3000/api/rsvp/ABC");
            const response = await GET(request, { params: Promise.resolve({ code: "ABC" }) });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid RSVP code format");
        });

        it("returns 404 for non-existent RSVP code", async () => {
            const mockChain = createMockChain({ data: null, error: { message: "Not found" } });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
            const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("RSVP code not found");
        });

        it("returns RSVP data with invitees successfully", async () => {
            const mockRsvp = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                updated_at: "2026-01-01",
                staying_villa: true,
                dietary_restrictions: "Vegan",
                song_request: "Dancing Queen",
                travel_plans: "Arriving Friday",
                message: "Excited!",
                accepted: true,
                invitation: { villa_offered: true },
            };
            const mockInvitees = [
                { id: "invitee-1", first_name: "John", last_name: "Doe", coming: true, is_primary: true },
                { id: "invitee-2", first_name: "Jane", last_name: "Doe", coming: true, is_primary: false },
            ];

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    // Invitees query ends with .eq() not .single(), so make the chain thenable
                    const chain = createMockChain({ data: mockInvitees, error: null });
                    return chain;
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
            const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.rsvpId).toBe("rsvp-123");
            expect(data.invitationId).toBe("inv-456");
            expect(data.accepted).toBe(true);
            expect(data.invitees).toHaveLength(2);
            expect(data.villaOffered).toBe(true);
        });

        it("returns villaOffered as false when villa not offered", async () => {
            const mockRsvp = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                updated_at: null,
                staying_villa: null,
                dietary_restrictions: null,
                song_request: null,
                travel_plans: null,
                message: null,
                accepted: null,
                invitation: { villa_offered: false },
            };
            const mockInvitees = [
                { id: "invitee-1", first_name: "Bob", last_name: "Smith", coming: null, is_primary: true },
            ];

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    return createMockChain({ data: mockInvitees, error: null });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
            const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.villaOffered).toBe(false);
        });

        it("defaults villaOffered to true when invitation data is missing", async () => {
            const mockRsvp = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                updated_at: null,
                staying_villa: null,
                dietary_restrictions: null,
                song_request: null,
                travel_plans: null,
                message: null,
                accepted: null,
                invitation: null,
            };
            const mockInvitees = [
                { id: "invitee-1", first_name: "Bob", last_name: "Smith", coming: null, is_primary: true },
            ];

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    return createMockChain({ data: mockInvitees, error: null });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
            const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.villaOffered).toBe(true);
        });

        it("returns is_primary field for invitees", async () => {
            const mockRsvp = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                updated_at: null,
                staying_villa: null,
                dietary_restrictions: null,
                song_request: null,
                travel_plans: null,
                message: null,
                accepted: null,
                invitation: { villa_offered: true },
            };
            const mockInvitees = [
                { id: "invitee-1", first_name: "David", last_name: "Wilson", coming: null, is_primary: true },
                { id: "invitee-2", first_name: "Emily", last_name: "Carter", coming: null, is_primary: false },
            ];

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    return createMockChain({ data: mockInvitees, error: null });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
            const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.invitees).toHaveLength(2);
            expect(data.invitees[0].is_primary).toBe(true);
            expect(data.invitees[1].is_primary).toBe(false);
        });
    });

    describe("POST /api/rsvp/[code]", () => {
        it("returns 403 when RSVP deadline has passed", async () => {
            mockIsRSVPClosed.mockReturnValue(true);

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toContain("RSVP submissions are now closed");
        });

        it("returns 400 for invalid code format when deadline has not passed", async () => {
            mockIsRSVPClosed.mockReturnValue(false);

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABC", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABC" }) });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid RSVP code format");
        });
    });

    describe("Edge Cases", () => {
        describe("GET Edge Cases", () => {
            it("returns empty invitees array when no invitees exist", async () => {
                const mockRsvp = {
                    id: "rsvp-123",
                    invitation_id: "inv-456",
                    updated_at: null,
                    staying_villa: false,
                    dietary_restrictions: null,
                    song_request: null,
                    travel_plans: null,
                    message: null,
                    accepted: null,
                };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    if (table === "invitees") {
                        return createMockChain({ data: [], error: null });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
                const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.invitees).toEqual([]);
            });

            it("returns null invitees as empty array", async () => {
                const mockRsvp = {
                    id: "rsvp-123",
                    invitation_id: "inv-456",
                    updated_at: null,
                    staying_villa: false,
                    dietary_restrictions: null,
                    song_request: null,
                    travel_plans: null,
                    message: null,
                    accepted: null,
                };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    if (table === "invitees") {
                        return createMockChain({ data: null, error: null });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
                const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.invitees).toEqual([]);
            });

            it("handles invitees fetch error", async () => {
                const mockRsvp = {
                    id: "rsvp-123",
                    invitation_id: "inv-456",
                    updated_at: null,
                    staying_villa: false,
                    dietary_restrictions: null,
                    song_request: null,
                    travel_plans: null,
                    message: null,
                    accepted: null,
                };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    if (table === "invitees") {
                        return createMockChain({ data: null, error: { message: "Database error" } });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF");
                const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF" }) });
                const data = await response.json();

                expect(response.status).toBe(500);
                expect(data.error).toBe("Failed to fetch invitees");
            });
        });
    });
});

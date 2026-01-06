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

describe("/api/rsvp/[code]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
            };
            const mockInvitees = [
                { id: "invitee-1", first_name: "John", last_name: "Doe", coming: true },
                { id: "invitee-2", first_name: "Jane", last_name: "Doe", coming: true },
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
        });
    });

    describe("POST /api/rsvp/[code]", () => {
        it("returns 400 for invalid code format", async () => {
            const request = new NextRequest("http://localhost:3000/api/rsvp/AB", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "AB" }) });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid RSVP code format");
        });

        it("returns 404 for non-existent RSVP code", async () => {
            const mockChain = createMockChain({ data: null, error: { message: "Not found" } });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/rsvp/NOTFND", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "NOTFND" }) });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("RSVP code not found");
        });

        it("updates RSVP successfully without invitees", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    const chain = createMockChain({ data: mockRsvp, error: null });
                    return chain;
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({
                    accepted: true,
                    staying_villa: true,
                    dietary_restrictions: "None",
                }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it("updates invitees with correct invitation_id filter (ownership validation)", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
            const inviteeEqCalls: string[][] = [];

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    const chain = createMockChain({ data: null, error: null });
                    // Track all .eq() calls to verify invitation_id filter
                    chain.eq = vi.fn().mockImplementation((field: string, value: string) => {
                        inviteeEqCalls.push([field, value]);
                        return chain; // Return chain for further chaining
                    });
                    return chain;
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({
                    accepted: true,
                    invitees: [{ id: "invitee-1", coming: true }],
                }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify that invitation_id filter was applied (security check)
            const invitationIdFilter = inviteeEqCalls.find(
                ([field, value]) => field === "invitation_id" && value === "inv-456"
            );
            expect(invitationIdFilter).toBeDefined();
        });

        it("updates multiple invitees from same invitation", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
            let inviteeUpdateCount = 0;

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    inviteeUpdateCount++;
                    return createMockChain({ data: null, error: null });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({
                    accepted: true,
                    invitees: [
                        { id: "invitee-1", coming: true },
                        { id: "invitee-2", coming: false },
                        { id: "invitee-3", coming: true },
                    ],
                }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(inviteeUpdateCount).toBe(3);
        });

        it("returns 500 when invitee update fails (no silent failure)", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    // Return error for invitee update
                    return createMockChain({ data: null, error: { message: "Database error" } });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({
                    accepted: true,
                    invitees: [{ id: "invitee-1", coming: true }],
                }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to update invitee attendance");
        });

        it("returns 500 when RSVP update fails", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    const chain = createMockChain({ data: mockRsvp, error: null });

                    // Override update to return error
                    chain.update = vi.fn().mockImplementation(() => {
                        const updateChain = createMockChain({ data: null, error: { message: "Update failed" } });
                        return updateChain;
                    });

                    return chain;
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to update RSVP");
        });

        it("converts code to uppercase for database lookup", async () => {
            const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
            let codeUsedForLookup = "";

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    const chain = createMockChain({ data: mockRsvp, error: null });
                    chain.eq = vi.fn().mockImplementation((field: string, value: string) => {
                        if (field === "short_url") {
                            codeUsedForLookup = value;
                        }
                        return chain;
                    });
                    return chain;
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/abcdef", {
                method: "POST",
                body: JSON.stringify({ accepted: true }),
            });
            await POST(request, { params: Promise.resolve({ code: "abcdef" }) });

            expect(codeUsedForLookup).toBe("ABCDEF");
        });
    });
});

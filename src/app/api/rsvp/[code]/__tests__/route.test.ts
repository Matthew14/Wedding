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
            const mockInvitation = { villa_offered: true };

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    const chain = createMockChain({ data: mockRsvp, error: null });
                    return chain;
                }
                if (table === "invitation") {
                    return createMockChain({ data: mockInvitation, error: null });
                }
                return createMockChain();
            });

            const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                method: "POST",
                body: JSON.stringify({
                    accepted: true,
                    staying_villa: "yes",
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
            let inviteeCallCount = 0;

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === "RSVPs") {
                    return createMockChain({ data: mockRsvp, error: null });
                }
                if (table === "invitees") {
                    inviteeCallCount++;
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
            // 3 invitee updates + 1 select for email notification
            expect(inviteeCallCount).toBe(4);
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

    describe("Edge Cases", () => {
        describe("Empty and Null Handling", () => {
            it("handles empty invitees array gracefully", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        invitees: [],
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.success).toBe(true);
            });

            it("handles null/undefined invitees field", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: false,
                        // invitees field omitted entirely
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.success).toBe(true);
            });

            it("handles empty string fields correctly", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updatedFields: Record<string, unknown> = {};

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation((fields: Record<string, unknown>) => {
                            updatedFields = fields;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        dietary_restrictions: "",
                        song_request: "",
                        travel_plans: "",
                        message: "",
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                expect(response.status).toBe(200);
                // Empty strings should be converted to null
                expect(updatedFields.dietary_restrictions).toBeNull();
                expect(updatedFields.song_request).toBeNull();
                expect(updatedFields.travel_plans).toBeNull();
                expect(updatedFields.message).toBeNull();
            });
        });

        describe("Special Characters and Unicode", () => {
            it("handles special characters in dietary restrictions", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updatedFields: Record<string, unknown> = {};

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation((fields: Record<string, unknown>) => {
                            updatedFields = fields;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                const specialChars = "Gluten-free, dairy-free & nut allergy! <script>alert('xss')</script>";
                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        dietary_restrictions: specialChars,
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                expect(response.status).toBe(200);
                expect(updatedFields.dietary_restrictions).toBe(specialChars);
            });

            it("handles unicode and emoji in message field", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updatedFields: Record<string, unknown> = {};

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation((fields: Record<string, unknown>) => {
                            updatedFields = fields;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                const unicodeMessage = "Can't wait! 🎉🎊 Félicitations! 日本語 مرحبا";
                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        message: unicodeMessage,
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                expect(response.status).toBe(200);
                expect(updatedFields.message).toBe(unicodeMessage);
            });

            it("handles SQL injection attempt in text fields", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updatedFields: Record<string, unknown> = {};

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation((fields: Record<string, unknown>) => {
                            updatedFields = fields;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                const sqlInjection = "'; DROP TABLE RSVPs; --";
                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        song_request: sqlInjection,
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                // Should succeed - Supabase handles SQL injection protection
                expect(response.status).toBe(200);
                expect(updatedFields.song_request).toBe(sqlInjection);
            });
        });

        describe("Invalid Input Handling", () => {
            it("handles malformed JSON body", async () => {
                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: "{ invalid json }",
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                expect(response.status).toBe(500);
            });

            it("handles code with special characters", async () => {
                // Mock database to return not found for special character codes
                mockSupabaseClient.from.mockReturnValue(
                    createMockChain({ data: null, error: { message: "Not found" } })
                );

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABC<>F", {
                    method: "POST",
                    body: JSON.stringify({ accepted: true }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABC<>F" }) });

                // 6 characters but invalid - should still try lookup and fail gracefully
                expect(response.status).toBe(404);
            });

            it("handles extremely long code parameter", async () => {
                const longCode = "A".repeat(1000);
                const request = new NextRequest(`http://localhost:3000/api/rsvp/${longCode}`, {
                    method: "POST",
                    body: JSON.stringify({ accepted: true }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: longCode }) });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data.error).toBe("Invalid RSVP code format");
            });

            it("handles invitee with missing id field", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        return createMockChain({ data: mockRsvp, error: null });
                    }
                    if (table === "invitees") {
                        // The update with undefined id should still be called
                        return createMockChain({ data: null, error: null });
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: true,
                        invitees: [{ coming: true }], // missing 'id' field
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                // Should succeed - the database query will just match nothing
                expect(response.status).toBe(200);
            });

            it("handles boolean string values for accepted field", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updatedFields: Record<string, unknown> = {};

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation((fields: Record<string, unknown>) => {
                            updatedFields = fields;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                const request = new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                    method: "POST",
                    body: JSON.stringify({
                        accepted: "true", // string instead of boolean
                    }),
                });
                const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF" }) });

                expect(response.status).toBe(200);
                // Note: JavaScript truthy - "true" string is truthy
                expect(updatedFields.accepted).toBe("true");
            });
        });

        describe("Concurrent Operations", () => {
            it("handles multiple simultaneous updates to same RSVP", async () => {
                const mockRsvp = { id: "rsvp-123", invitation_id: "inv-456" };
                let updateCount = 0;

                mockSupabaseClient.from.mockImplementation((table: string) => {
                    if (table === "RSVPs") {
                        const chain = createMockChain({ data: mockRsvp, error: null });
                        chain.update = vi.fn().mockImplementation(() => {
                            updateCount++;
                            return createMockChain({ data: null, error: null });
                        });
                        return chain;
                    }
                    return createMockChain();
                });

                // Send multiple concurrent requests
                const requests = Array.from({ length: 5 }, () =>
                    new NextRequest("http://localhost:3000/api/rsvp/ABCDEF", {
                        method: "POST",
                        body: JSON.stringify({ accepted: true }),
                    })
                );

                const responses = await Promise.all(
                    requests.map((req) => POST(req, { params: Promise.resolve({ code: "ABCDEF" }) }))
                );

                // All requests should succeed
                responses.forEach((response) => {
                    expect(response.status).toBe(200);
                });
                expect(updateCount).toBe(5);
            });
        });

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

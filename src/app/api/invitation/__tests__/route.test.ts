import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../[slug]/route";

// Mock Supabase
const mockSupabaseClient = {
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
    })),
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe("/api/invitation/[slug]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/invitation/[names-code]", () => {
        it("returns invitation data for valid code and matching names (couple)", async () => {
            const mockRSVP = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                short_url: "ABC123",
            };

            const mockInvitees = [
                { id: "inv-1", first_name: "James", last_name: "Smith" },
                { id: "inv-2", first_name: "Mary", last_name: "Smith" },
            ];

            // Mock RSVP query
            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockRSVP,
                    error: null,
                }),
            };

            // Mock invitees query
            const mockInviteesChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockInvitees,
                    error: null,
                }),
                single: vi.fn().mockReturnThis(),
            };

            mockSupabaseClient.from
                .mockReturnValueOnce(mockRSVPChain)
                .mockReturnValueOnce(mockInviteesChain);

            const request = new NextRequest(
                "http://localhost:3000/api/invitation/james-mary-ABC123"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "james-mary-ABC123" }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
            expect(data.code).toBe("ABC123");
            expect(data.guestNames).toEqual(["James", "Mary"]);
            expect(data.invitationId).toBe("inv-456");
        });

        it("returns invitation data for single guest", async () => {
            const mockRSVP = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                short_url: "XYZ789",
            };

            const mockInvitees = [
                { id: "inv-1", first_name: "Sarah", last_name: "Jones" },
            ];

            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockRSVP,
                    error: null,
                }),
            };

            const mockInviteesChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockInvitees,
                    error: null,
                }),
                single: vi.fn().mockReturnThis(),
            };

            mockSupabaseClient.from
                .mockReturnValueOnce(mockRSVPChain)
                .mockReturnValueOnce(mockInviteesChain);

            const request = new NextRequest(
                "http://localhost:3000/api/invitation/sarah-XYZ789"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "sarah-XYZ789" }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
            expect(data.guestNames).toEqual(["Sarah"]);
        });

        it("returns 404 for invalid code", async () => {
            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                }),
            };

            mockSupabaseClient.from.mockReturnValue(mockRSVPChain);

            const request = new NextRequest(
                "http://localhost:3000/api/invitation/james-INVALI"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "james-INVALI" }),
            });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("Invalid invitation link");
        });

        it("returns 404 when names don't match invitees", async () => {
            const mockRSVP = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                short_url: "ABC123",
            };

            const mockInvitees = [
                { id: "inv-1", first_name: "John", last_name: "Doe" },
            ];

            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockRSVP,
                    error: null,
                }),
            };

            const mockInviteesChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockInvitees,
                    error: null,
                }),
                single: vi.fn().mockReturnThis(),
            };

            mockSupabaseClient.from
                .mockReturnValueOnce(mockRSVPChain)
                .mockReturnValueOnce(mockInviteesChain);

            const request = new NextRequest(
                "http://localhost:3000/api/invitation/james-ABC123"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "james-ABC123" }),
            });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("Invalid invitation link");
        });

        it("returns 404 for slug too short", async () => {
            const request = new NextRequest(
                "http://localhost:3000/api/invitation/a-ABC"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "a-ABC" }),
            });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("Invalid invitation link");
        });

        it("returns 404 for invalid code format (not 6 chars)", async () => {
            const request = new NextRequest(
                "http://localhost:3000/api/invitation/james-ABC"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "james-ABC" }),
            });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("Invalid invitation link");
        });

        it("handles case-insensitive name matching", async () => {
            const mockRSVP = {
                id: "rsvp-123",
                invitation_id: "inv-456",
                short_url: "ABC123",
            };

            const mockInvitees = [
                { id: "inv-1", first_name: "James", last_name: "Smith" },
            ];

            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: mockRSVP,
                    error: null,
                }),
            };

            const mockInviteesChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockInvitees,
                    error: null,
                }),
                single: vi.fn().mockReturnThis(),
            };

            mockSupabaseClient.from
                .mockReturnValueOnce(mockRSVPChain)
                .mockReturnValueOnce(mockInviteesChain);

            // Use uppercase names in URL
            const request = new NextRequest(
                "http://localhost:3000/api/invitation/JAMES-ABC123"
            );

            const response = await GET(request, {
                params: Promise.resolve({ slug: "JAMES-ABC123" }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it("uses generic error message for security (no info leakage)", async () => {
            // Test that we don't reveal whether the code exists or names are wrong
            const mockRSVPChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                }),
            };

            mockSupabaseClient.from.mockReturnValue(mockRSVPChain);

            const response1 = await GET(
                new NextRequest("http://localhost:3000/api/invitation/wrong-ABC123"),
                { params: Promise.resolve({ slug: "wrong-ABC123" }) }
            );

            const response2 = await GET(
                new NextRequest("http://localhost:3000/api/invitation/james-WRONG1"),
                { params: Promise.resolve({ slug: "james-WRONG1" }) }
            );

            const data1 = await response1.json();
            const data2 = await response2.json();

            // Both should return the same generic error
            expect(data1.error).toBe("Invalid invitation link");
            expect(data2.error).toBe("Invalid invitation link");
        });
    });
});

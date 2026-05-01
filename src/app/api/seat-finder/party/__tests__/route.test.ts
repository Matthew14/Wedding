import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();
const mockSupabaseClient = {
    from: mockFrom,
    auth: { getUser: vi.fn() },
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock("@/utils/api/rateLimit", () => ({
    checkRateLimit: vi.fn(() => ({ success: true })),
    rateLimitedResponse: vi.fn(),
    RATE_LIMITS: { GENERAL: {} },
}));

const makeRequest = (id: string) =>
    new NextRequest(`http://localhost:3907/api/seat-finder/party?id=${encodeURIComponent(id)}`);

const makeNoIdRequest = () =>
    new NextRequest("http://localhost:3907/api/seat-finder/party");

/** Build a per-call mock: first call uses singleResult, second call uses listResult. */
const setupTwoCalls = (
    singleResult: object,
    listResult: object
) => {
    const singleChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(singleResult),
    };

    const listChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        // make thenable so the route can await it directly
        then: (resolve: (v: object) => void) => Promise.resolve(listResult).then(resolve),
    };

    mockFrom
        .mockReturnValueOnce(singleChain)
        .mockReturnValueOnce(listChain);

    return { singleChain, listChain };
};

describe("GET /api/seat-finder/party", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("validation", () => {
        it("returns 400 when id param is missing", async () => {
            const res = await GET(makeNoIdRequest());
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe("Invalid id");
        });

        it("returns 400 when id param is blank whitespace", async () => {
            const res = await GET(makeRequest("   "));
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe("Invalid id");
        });
    });

    describe("invitee lookup", () => {
        it("returns 404 when the invitee is not found", async () => {
            const singleChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            };
            mockFrom.mockReturnValueOnce(singleChain);

            const res = await GET(makeRequest("nonexistent-id"));
            expect(res.status).toBe(404);
            expect((await res.json()).error).toBe("Guest not found");
        });

        it("returns 404 when the database returns an error on the first query", async () => {
            const singleChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "query error" } }),
            };
            mockFrom.mockReturnValueOnce(singleChain);

            const res = await GET(makeRequest("123"));
            expect(res.status).toBe(404);
        });
    });

    describe("successful party fetch", () => {
        it("returns party members for a valid invitee id", async () => {
            const partyMembers = [
                {
                    id: "1",
                    first_name: "Alice",
                    last_name: "Smith",
                    is_primary: true,
                    table_number: "3",
                    seat_number: 2,
                },
                {
                    id: "2",
                    first_name: "Bob",
                    last_name: "Smith",
                    is_primary: false,
                    table_number: "3",
                    seat_number: 3,
                },
            ];

            setupTwoCalls(
                { data: { invitation_id: "inv-abc" }, error: null },
                { data: partyMembers, error: null }
            );

            const res = await GET(makeRequest("1"));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.party).toEqual(partyMembers);
        });

        it("uses the invitation_id from the first query to fetch party members", async () => {
            const { singleChain, listChain } = setupTwoCalls(
                { data: { invitation_id: "inv-xyz" }, error: null },
                { data: [], error: null }
            );

            await GET(makeRequest("1"));

            expect(singleChain.eq).toHaveBeenCalledWith("id", "1");
            expect(listChain.eq).toHaveBeenCalledWith("invitation_id", "inv-xyz");
        });

        it("filters party members by coming=true and seat_number not null", async () => {
            const { listChain } = setupTwoCalls(
                { data: { invitation_id: "inv-abc" }, error: null },
                { data: [], error: null }
            );

            await GET(makeRequest("1"));

            expect(listChain.eq).toHaveBeenCalledWith("coming", true);
            expect(listChain.not).toHaveBeenCalledWith("seat_number", "is", null);
        });

        it("returns empty party array when no seated members exist", async () => {
            setupTwoCalls(
                { data: { invitation_id: "inv-abc" }, error: null },
                { data: [], error: null }
            );

            const res = await GET(makeRequest("1"));
            expect(res.status).toBe(200);
            expect((await res.json()).party).toEqual([]);
        });
    });

    describe("error handling", () => {
        it("returns 500 when the party query fails", async () => {
            const singleChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { invitation_id: "inv-abc" }, error: null }),
            };
            const listChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: (resolve: (v: object) => void) =>
                    Promise.resolve({ data: null, error: { message: "db failure" } }).then(resolve),
            };

            mockFrom
                .mockReturnValueOnce(singleChain)
                .mockReturnValueOnce(listChain);

            const res = await GET(makeRequest("1"));
            expect(res.status).toBe(500);
            expect((await res.json()).error).toBe("Internal server error");
        });
    });

    describe("rate limiting", () => {
        it("returns rate-limited response when limit is exceeded", async () => {
            const { checkRateLimit, rateLimitedResponse } = await import("@/utils/api/rateLimit");
            vi.mocked(checkRateLimit).mockReturnValueOnce({ success: false } as ReturnType<typeof checkRateLimit>);
            const mockLimitedRes = new Response(null, { status: 429 });
            const typed = mockLimitedRes as ReturnType<typeof rateLimitedResponse>;
            vi.mocked(rateLimitedResponse).mockReturnValueOnce(typed);

            const res = await GET(makeRequest("1"));
            expect(res.status).toBe(429);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();
const mockSupabaseClient = {
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }) },
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock("@/utils/api/rateLimit", () => ({
    checkRateLimit: vi.fn(() => ({ success: true })),
    rateLimitedResponse: vi.fn(),
    RATE_LIMITS: { GENERAL: {} },
}));

const createChain = (resolveWith: object) => {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(resolveWith),
    };
    return chain;
};

const makeRequest = (q: string) =>
    new NextRequest(`http://localhost:3907/api/seat-finder/search?q=${encodeURIComponent(q)}`);

describe("GET /api/seat-finder/search", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("input sanitisation", () => {
        it("returns empty array when q is absent", async () => {
            const req = new NextRequest("http://localhost:3907/api/seat-finder/search");
            const res = await GET(req);
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([]);
        });

        it("returns empty array when q is a single character", async () => {
            const res = await GET(makeRequest("A"));
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([]);
        });

        it("returns empty array when q becomes < 2 chars after stripping disallowed chars", async () => {
            // "1a" — the digit is stripped, leaving just "a" (1 char)
            const res = await GET(makeRequest("1a"));
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([]);
        });

        it("strips non-alpha/space/hyphen/apostrophe characters before querying", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            // "Jo123hn" — digits stripped, leaving "John" (4 chars) which is valid
            const res = await GET(makeRequest("Jo123hn"));
            expect(res.status).toBe(200);
            // The or() call should have used the sanitised value
            expect(chain.or).toHaveBeenCalledWith(
                expect.stringContaining("John")
            );
            expect(chain.or).not.toHaveBeenCalledWith(
                expect.stringContaining("123")
            );
        });

        it("allows hyphens and apostrophes through", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await GET(makeRequest("O'Brien"));
            expect(chain.or).toHaveBeenCalledWith(
                expect.stringContaining("O'Brien")
            );
        });
    });

    describe("successful search", () => {
        it("returns mapped results for a valid query", async () => {
            const dbRows = [
                { id: "1", first_name: "Alice", last_name: "Smith" },
                { id: "2", first_name: "Alan",  last_name: "Jones" },
            ];
            const chain = createChain({ data: dbRows, error: null });
            mockFrom.mockReturnValue(chain);

            const res = await GET(makeRequest("Al"));
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([
                { id: "1", name: "Alice Smith" },
                { id: "2", name: "Alan Jones"  },
            ]);
        });

        it("queries the invitees table with coming=true and seat_number not null filters", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await GET(makeRequest("Jo"));

            expect(mockFrom).toHaveBeenCalledWith("invitees");
            expect(chain.eq).toHaveBeenCalledWith("coming", true);
            expect(chain.not).toHaveBeenCalledWith("seat_number", "is", null);
        });

        it("returns empty array when no matches found", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            const res = await GET(makeRequest("Zzz"));
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([]);
        });
    });

    describe("error handling", () => {
        it("returns 500 when the database returns an error", async () => {
            const chain = createChain({ data: null, error: { message: "db failure" } });
            mockFrom.mockReturnValue(chain);

            const res = await GET(makeRequest("Jo"));
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe("Internal server error");
        });
    });

    describe("rate limiting", () => {
        it("returns the rate-limited response when the limit is exceeded", async () => {
            const { checkRateLimit, rateLimitedResponse } = await import("@/utils/api/rateLimit");
            vi.mocked(checkRateLimit).mockReturnValueOnce({ success: false } as ReturnType<typeof checkRateLimit>);
            const mockLimitedRes = new Response(null, { status: 429 });
            const typed = mockLimitedRes as ReturnType<typeof rateLimitedResponse>;
            vi.mocked(rateLimitedResponse).mockReturnValueOnce(typed);

            const res = await GET(makeRequest("Jo"));
            expect(res.status).toBe(429);
        });
    });
});

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

const createChain = (resolveWith: object) => {
    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        // The route calls .order() twice — the second call resolves
        then: (resolve: (v: object) => void) => Promise.resolve(resolveWith).then(resolve),
    };
    return chain;
};

const makeRequest = () =>
    new NextRequest("http://localhost:3907/api/seat-finder/seats");

describe("GET /api/seat-finder/seats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("successful response", () => {
        it("returns all seated invitees mapped to { tableNumber, seatNumber, name }", async () => {
            const dbRows = [
                { first_name: "Alice", last_name: "Smith", table_number: "1", seat_number: 1 },
                { first_name: "Bob",   last_name: "Jones", table_number: "1", seat_number: 2 },
                { first_name: "Carol", last_name: "White", table_number: "2", seat_number: 1 },
            ];
            mockFrom.mockReturnValue(createChain({ data: dbRows, error: null }));

            const res = await GET(makeRequest());
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([
                { tableNumber: "1", seatNumber: 1, name: "Alice Smith" },
                { tableNumber: "1", seatNumber: 2, name: "Bob Jones" },
                { tableNumber: "2", seatNumber: 1, name: "Carol White" },
            ]);
        });

        it("returns an empty array when there are no seated invitees", async () => {
            mockFrom.mockReturnValue(createChain({ data: [], error: null }));

            const res = await GET(makeRequest());
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([]);
        });

        it("queries invitees with coming=true and seat_number not null filters", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await GET(makeRequest());

            expect(mockFrom).toHaveBeenCalledWith("invitees");
            expect(chain.eq).toHaveBeenCalledWith("coming", true);
            expect(chain.not).toHaveBeenCalledWith("seat_number", "is", null);
        });

        it("orders results by table_number then seat_number", async () => {
            const chain = createChain({ data: [], error: null });
            mockFrom.mockReturnValue(chain);

            await GET(makeRequest());

            expect(chain.order).toHaveBeenCalledWith("table_number");
            expect(chain.order).toHaveBeenCalledWith("seat_number");
        });
    });

    describe("error handling", () => {
        it("returns 500 when the database returns an error", async () => {
            mockFrom.mockReturnValue(createChain({ data: null, error: { message: "connection refused" } }));

            const res = await GET(makeRequest());
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

            const res = await GET(makeRequest());
            expect(res.status).toBe(429);
        });
    });
});

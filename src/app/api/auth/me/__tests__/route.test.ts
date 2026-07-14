import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const savedMaster = process.env.MASTER_INVITATION_CODE;

function makeRequest(): NextRequest {
    return new NextRequest("http://localhost/api/auth/me");
}

describe("GET /api/auth/me", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MASTER_INVITATION_CODE = "LOCAL1";
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
    });
    afterEach(() => {
        if (savedMaster === undefined) delete process.env.MASTER_INVITATION_CODE;
        else process.env.MASTER_INVITATION_CODE = savedMaster;
    });

    it("returns email and master code to an authenticated admin", async () => {
        const res = await GET(makeRequest());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ email: "admin@test.com", masterCode: "LOCAL1" });
    });

    it("returns null masterCode when the env var is unset", async () => {
        delete process.env.MASTER_INVITATION_CODE;
        const res = await GET(makeRequest());
        expect((await res.json()).masterCode).toBeNull();
    });

    it("rejects unauthenticated callers without leaking the master code", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        });
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
        expect(JSON.stringify(await res.json())).not.toContain("LOCAL1");
    });
});

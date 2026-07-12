import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";

const mockSignOut = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock("@/utils/auth/cognito", () => ({
    signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/utils/auth/session", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/auth/session")>();
    return {
        ...actual,
        getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
    };
});

describe("POST /api/auth/logout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAccessToken.mockResolvedValue("access-token");
    });

    it("clears all four auth cookies", async () => {
        const res = await POST();
        expect(res.status).toBe(200);
        for (const name of ["wedding_session", "wedding_access", "wedding_refresh", "wedding_refresh_user"]) {
            const cookie = res.cookies.get(name);
            expect(cookie?.value).toBe("");
            expect(cookie?.maxAge).toBe(0);
        }
    });

    it("revokes the Cognito session via GlobalSignOut", async () => {
        await POST();
        expect(mockSignOut).toHaveBeenCalledWith("access-token");
    });

    it("still clears cookies when GlobalSignOut fails", async () => {
        mockSignOut.mockRejectedValue(new Error("boom"));
        const res = await POST();
        expect(res.status).toBe(200);
        expect(res.cookies.get("wedding_refresh")?.maxAge).toBe(0);
    });
});

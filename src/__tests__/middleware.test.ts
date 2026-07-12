import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

const mockJwtVerify = vi.fn();
const mockRefreshTokens = vi.fn();

vi.mock("jose", () => ({
    jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
    createRemoteJWKSet: () => () => ({}),
    decodeJwt: () => ({}),
}));

vi.mock("@/utils/auth/refresh", () => ({
    refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}));

const savedEnv: Record<string, string | undefined> = {};
const ENV = { COGNITO_CLIENT_ID: "client-123", COGNITO_USER_POOL_ID: "eu-west-1_test" };

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
    const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    return new NextRequest(`http://localhost${path}`, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
}

const refreshCookies = { wedding_refresh: "refresh-tok", wedding_refresh_user: "uuid-1" };
const freshTokens = { idToken: "new-id", accessToken: "new-access", expiresIn: 3600 };

describe("middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const [k, v] of Object.entries(ENV)) {
            savedEnv[k] = process.env[k];
            process.env[k] = v;
        }
        // Each test gets unique refresh-token values where dedup matters;
        // jwtVerify rejects (expired/invalid session) unless overridden.
        mockJwtVerify.mockRejectedValue(new Error("expired"));
    });
    afterEach(() => {
        for (const k of Object.keys(ENV)) {
            if (savedEnv[k] === undefined) delete process.env[k];
            else process.env[k] = savedEnv[k];
        }
    });

    it("redirects /dashboard to /login with no cookies at all", async () => {
        const res = await middleware(makeRequest("/dashboard"));
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login?redirectedFrom=%2Fdashboard");
        expect(mockRefreshTokens).not.toHaveBeenCalled();
    });

    it("passes through /dashboard with a valid session", async () => {
        mockJwtVerify.mockResolvedValue({ payload: {} });
        const res = await middleware(makeRequest("/dashboard", { wedding_session: "valid" }));
        expect(res.status).toBe(200);
        expect(mockRefreshTokens).not.toHaveBeenCalled();
    });

    it("refreshes an expired session and sets new cookies", async () => {
        mockRefreshTokens.mockResolvedValue(freshTokens);
        const req = makeRequest("/dashboard", { wedding_session: "expired", ...refreshCookies });
        const res = await middleware(req);

        expect(res.status).toBe(200);
        expect(mockRefreshTokens).toHaveBeenCalledWith("refresh-tok", "uuid-1");
        expect(res.cookies.get("wedding_session")?.value).toBe("new-id");
        expect(res.cookies.get("wedding_access")?.value).toBe("new-access");
        // The current request's handlers must see the fresh session too
        expect(req.cookies.get("wedding_session")?.value).toBe("new-id");
    });

    it("redirects to /login when the refresh token is rejected", async () => {
        mockRefreshTokens.mockResolvedValue(null);
        const res = await middleware(
            makeRequest("/dashboard", { wedding_refresh: "revoked-tok", wedding_refresh_user: "uuid-1" })
        );
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
    });

    it("redirects an authenticated user away from /login", async () => {
        mockJwtVerify.mockResolvedValue({ payload: {} });
        const res = await middleware(makeRequest("/login", { wedding_session: "valid" }));
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/dashboard");
    });

    it("lets unauthenticated /api requests pass through without refresh attempts", async () => {
        const res = await middleware(makeRequest("/api/photos"));
        expect(res.status).toBe(200);
        expect(mockRefreshTokens).not.toHaveBeenCalled();
    });

    it("refreshes on /api requests and sets cookies for the stale-tab case", async () => {
        mockRefreshTokens.mockResolvedValue(freshTokens);
        const res = await middleware(
            makeRequest("/api/dashboard/summary", { wedding_refresh: "api-tok", wedding_refresh_user: "uuid-1" })
        );
        expect(res.status).toBe(200);
        expect(res.cookies.get("wedding_session")?.value).toBe("new-id");
    });

    it("de-duplicates concurrent refreshes for the same refresh token", async () => {
        let resolveRefresh: (v: typeof freshTokens) => void;
        mockRefreshTokens.mockReturnValue(new Promise((r) => (resolveRefresh = r)));

        const cookies = { wedding_refresh: "burst-tok", wedding_refresh_user: "uuid-1" };
        const inflight = Promise.all([
            middleware(makeRequest("/api/dashboard/summary", cookies)),
            middleware(makeRequest("/api/dashboard/photo-summary", cookies)),
            middleware(makeRequest("/dashboard", cookies)),
        ]);
        resolveRefresh!(freshTokens);
        const results = await inflight;

        expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.cookies.get("wedding_session")?.value).toBe("new-id");
        }
    });

    it("does not cache failed refreshes", async () => {
        mockRefreshTokens.mockResolvedValueOnce(null).mockResolvedValueOnce(freshTokens);
        const cookies = { wedding_refresh: "flaky-tok", wedding_refresh_user: "uuid-1" };

        const first = await middleware(makeRequest("/dashboard", cookies));
        expect(first.status).toBe(307);

        const second = await middleware(makeRequest("/dashboard", cookies));
        expect(second.status).toBe(200);
        expect(mockRefreshTokens).toHaveBeenCalledTimes(2);
    });
});

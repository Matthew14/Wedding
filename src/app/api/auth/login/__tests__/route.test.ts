import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockSignIn = vi.fn();
const mockCompleteNewPassword = vi.fn();

vi.mock("@/utils/auth/cognito", () => ({
    signIn: (...args: unknown[]) => mockSignIn(...args),
    completeNewPassword: (...args: unknown[]) => mockCompleteNewPassword(...args),
    isNewPasswordChallenge: (r: Record<string, unknown>) => "challenge" in r,
}));

vi.mock("@/utils/logger", () => ({
    info: vi.fn(),
    error: vi.fn(),
}));

// An unsigned JWT whose payload carries the immutable Cognito username.
function fakeIdToken(payload: Record<string, unknown>): string {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    return `${b64({ alg: "none" })}.${b64(payload)}.`;
}

const tokens = {
    idToken: fakeIdToken({ "cognito:username": "uuid-1234", email: "admin@test.com" }),
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
};

function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /api/auth/login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sets session, access, refresh, and username cookies on login", async () => {
        mockSignIn.mockResolvedValue(tokens);
        const res = await POST(makeRequest({ email: "admin@test.com", password: "pw" }));
        expect(res.status).toBe(200);

        expect(res.cookies.get("wedding_session")?.value).toBe(tokens.idToken);
        expect(res.cookies.get("wedding_access")?.value).toBe("access-token");
        expect(res.cookies.get("wedding_refresh")?.value).toBe("refresh-token");
        // The immutable username from the ID token, not the login email
        expect(res.cookies.get("wedding_refresh_user")?.value).toBe("uuid-1234");

        // Refresh cookies outlive the 1-hour session
        expect(res.cookies.get("wedding_refresh")?.maxAge).toBe(30 * 24 * 60 * 60);
        expect(res.cookies.get("wedding_session")?.maxAge).toBe(3600);
        expect(res.cookies.get("wedding_refresh")?.httpOnly).toBe(true);
    });

    it("falls back to the email when the ID token has no cognito:username", async () => {
        mockSignIn.mockResolvedValue({ ...tokens, idToken: fakeIdToken({ email: "admin@test.com" }) });
        const res = await POST(makeRequest({ email: "admin@test.com", password: "pw" }));
        expect(res.cookies.get("wedding_refresh_user")?.value).toBe("admin@test.com");
    });

    it("sets the same cookies after a NEW_PASSWORD_REQUIRED completion", async () => {
        mockCompleteNewPassword.mockResolvedValue(tokens);
        const res = await POST(
            makeRequest({ email: "admin@test.com", password: "pw", newPassword: "new", session: "sess" })
        );
        expect(res.status).toBe(200);
        expect(res.cookies.get("wedding_refresh")?.value).toBe("refresh-token");
        expect(res.cookies.get("wedding_refresh_user")?.value).toBe("uuid-1234");
    });

    it("returns the challenge without cookies when a new password is required", async () => {
        mockSignIn.mockResolvedValue({ challenge: "NEW_PASSWORD_REQUIRED", session: "s", username: "u" });
        const res = await POST(makeRequest({ email: "admin@test.com", password: "pw" }));
        const data = await res.json();
        expect(data.challenge).toBe("NEW_PASSWORD_REQUIRED");
        expect(res.cookies.get("wedding_refresh")).toBeUndefined();
    });

    it("rejects missing credentials", async () => {
        const res = await POST(makeRequest({ email: "admin@test.com" }));
        expect(res.status).toBe(400);
    });

    it("returns 401 when Cognito rejects the credentials", async () => {
        mockSignIn.mockRejectedValue(new Error("Incorrect username or password."));
        const res = await POST(makeRequest({ email: "admin@test.com", password: "wrong" }));
        expect(res.status).toBe(401);
    });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { refreshTokens, computeSecretHash } from "../refresh";

const ENV_KEYS = ["COGNITO_CLIENT_ID", "COGNITO_CLIENT_SECRET", "AWS_ENDPOINT_URL", "AWS_REGION"] as const;
const savedEnv: Record<string, string | undefined> = {};

const mockFetch = vi.fn();

describe("computeSecretHash", () => {
    beforeEach(() => {
        for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
        process.env.COGNITO_CLIENT_SECRET = "test-secret";
    });
    afterEach(() => {
        for (const k of ENV_KEYS) {
            if (savedEnv[k] === undefined) delete process.env[k];
            else process.env[k] = savedEnv[k];
        }
    });

    it("computes HMAC-SHA256(username + clientId) base64-encoded", async () => {
        const expected = createHmac("sha256", "test-secret")
            .update("user-uuid" + "client-123")
            .digest("base64");
        expect(await computeSecretHash("user-uuid", "client-123")).toBe(expected);
    });

    it("throws without COGNITO_CLIENT_SECRET", async () => {
        delete process.env.COGNITO_CLIENT_SECRET;
        await expect(computeSecretHash("u", "c")).rejects.toThrow("COGNITO_CLIENT_SECRET");
    });
});

describe("refreshTokens", () => {
    beforeEach(() => {
        for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
        process.env.COGNITO_CLIENT_ID = "client-123";
        process.env.COGNITO_CLIENT_SECRET = "test-secret";
        delete process.env.AWS_ENDPOINT_URL;
        vi.stubGlobal("fetch", mockFetch);
        mockFetch.mockReset();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        for (const k of ENV_KEYS) {
            if (savedEnv[k] === undefined) delete process.env[k];
            else process.env[k] = savedEnv[k];
        }
    });

    it("exchanges a refresh token via REFRESH_TOKEN_AUTH", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                AuthenticationResult: {
                    IdToken: "new-id",
                    AccessToken: "new-access",
                    ExpiresIn: 3600,
                },
            }),
        });

        const result = await refreshTokens("refresh-tok", "user-uuid");
        expect(result).toEqual({ idToken: "new-id", accessToken: "new-access", expiresIn: 3600 });

        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe("https://cognito-idp.eu-west-1.amazonaws.com/");
        expect(init.headers["X-Amz-Target"]).toBe("AWSCognitoIdentityProviderService.InitiateAuth");
        const body = JSON.parse(init.body);
        expect(body.AuthFlow).toBe("REFRESH_TOKEN_AUTH");
        expect(body.AuthParameters.REFRESH_TOKEN).toBe("refresh-tok");
        // SECRET_HASH is keyed on the immutable username, not the email
        const expectedHash = createHmac("sha256", "test-secret")
            .update("user-uuid" + "client-123")
            .digest("base64");
        expect(body.AuthParameters.SECRET_HASH).toBe(expectedHash);
    });

    it("includes a rotated refresh token when Cognito returns one", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                AuthenticationResult: {
                    IdToken: "id",
                    AccessToken: "access",
                    ExpiresIn: 3600,
                    RefreshToken: "rotated",
                },
            }),
        });
        const result = await refreshTokens("old", "user-uuid");
        expect(result?.refreshToken).toBe("rotated");
    });

    it("uses AWS_ENDPOINT_URL when set (LocalStack)", async () => {
        process.env.AWS_ENDPOINT_URL = "http://localhost:4566";
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        await refreshTokens("tok", "user");
        expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:4566");
    });

    it("returns null when Cognito rejects the token", async () => {
        mockFetch.mockResolvedValue({ ok: false, json: async () => ({ __type: "NotAuthorizedException" }) });
        expect(await refreshTokens("revoked", "user-uuid")).toBeNull();
    });

    it("returns null on network failure", async () => {
        mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
        expect(await refreshTokens("tok", "user-uuid")).toBeNull();
    });

    it("returns null when client env vars are missing", async () => {
        delete process.env.COGNITO_CLIENT_ID;
        expect(await refreshTokens("tok", "user-uuid")).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

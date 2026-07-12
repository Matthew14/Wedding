// Cognito REFRESH_TOKEN_AUTH via plain fetch rather than the AWS SDK: this
// runs inside Next.js middleware (edge runtime), where the SDK is not a safe
// dependency. InitiateAuth is an unsigned API, so no credentials are needed.

export interface RefreshedTokens {
    idToken: string;
    accessToken: string;
    expiresIn: number;
    // Only present when the user pool rotates refresh tokens.
    refreshToken?: string;
}

// With a client secret, SECRET_HASH is HMAC-SHA256(username + clientId).
// Uses Web Crypto so it works in both the Node and edge runtimes.
export async function computeSecretHash(username: string, clientId: string): Promise<string> {
    const clientSecret = process.env.COGNITO_CLIENT_SECRET;
    if (!clientSecret) throw new Error("COGNITO_CLIENT_SECRET environment variable is required");

    const message = username + clientId;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(clientSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Exchanges a refresh token for fresh ID/access tokens. Returns null on any
// failure (expired/revoked refresh token, misconfiguration, network) — the
// caller treats that as "not authenticated" and falls through to login.
//
// `username` must be the user's immutable Cognito username (the
// `cognito:username` claim — a UUID in pools where email is an alias), not
// the email they signed in with: SECRET_HASH for this flow is computed from
// the real username.
export async function refreshTokens(
    refreshToken: string,
    username: string
): Promise<RefreshedTokens | null> {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId || !process.env.COGNITO_CLIENT_SECRET) return null;

    const region = process.env.AWS_REGION ?? "eu-west-1";
    // AWS_ENDPOINT_URL points at LocalStack Cognito in local dev.
    const endpoint = process.env.AWS_ENDPOINT_URL ?? `https://cognito-idp.${region}.amazonaws.com/`;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-amz-json-1.1",
                "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
            },
            body: JSON.stringify({
                AuthFlow: "REFRESH_TOKEN_AUTH",
                ClientId: clientId,
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken,
                    SECRET_HASH: await computeSecretHash(username, clientId),
                },
            }),
        });
        if (!res.ok) return null;

        const data = await res.json();
        const auth = data.AuthenticationResult;
        if (!auth?.IdToken || !auth?.AccessToken) return null;

        return {
            idToken: auth.IdToken,
            accessToken: auth.AccessToken,
            expiresIn: auth.ExpiresIn ?? 3600,
            ...(auth.RefreshToken && { refreshToken: auth.RefreshToken }),
        };
    } catch {
        return null;
    }
}

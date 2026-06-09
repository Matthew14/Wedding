import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Bracket notation prevents Next.js webpack from inlining these at build time,
// ensuring the runtime Lambda values are used instead of build-time substitutions.
function getEnv(key: string): string {
    const val = process.env[key];
    if (!val) throw new Error(`${key} environment variable is required`);
    return val;
}

const client = new CognitoIdentityProviderClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
});

export interface CognitoTokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
}

export async function signIn(email: string, password: string): Promise<CognitoTokens> {
    const clientId = getEnv("COGNITO_CLIENT_ID");
    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: await computeSecretHash(email, clientId),
        },
    });

    const result = await client.send(command);
    const auth = result.AuthenticationResult;

    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
        throw new Error("Authentication failed");
    }

    return {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken,
        expiresIn: auth.ExpiresIn ?? 3600,
    };
}

export async function signOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({ AccessToken: accessToken });
    await client.send(command);
}

async function computeSecretHash(username: string, clientId: string): Promise<string> {
    const clientSecret = getEnv("COGNITO_CLIENT_SECRET");
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

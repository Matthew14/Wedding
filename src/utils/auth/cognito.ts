import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION ?? "eu-west-1",
});

export interface CognitoTokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
}

export async function signIn(email: string, password: string): Promise<CognitoTokens> {
    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID!,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: await computeSecretHash(email),
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

async function computeSecretHash(username: string): Promise<string> {
    const clientSecret = process.env.COGNITO_CLIENT_SECRET!;
    const clientId = process.env.COGNITO_CLIENT_ID!;
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

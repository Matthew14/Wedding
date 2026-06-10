import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    GlobalSignOutCommand,
    RespondToAuthChallengeCommand,
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

export interface NewPasswordChallenge {
    challenge: "NEW_PASSWORD_REQUIRED";
    session: string;
    username: string;
}

export type SignInResult = CognitoTokens | NewPasswordChallenge;

export function isNewPasswordChallenge(r: SignInResult): r is NewPasswordChallenge {
    return "challenge" in r;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) throw new Error("COGNITO_CLIENT_ID environment variable is required");

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

    if (result.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        if (!result.Session) throw new Error("Missing session in NEW_PASSWORD_REQUIRED challenge");
        return { challenge: "NEW_PASSWORD_REQUIRED", session: result.Session, username: email };
    }

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

export async function completeNewPassword(
    username: string,
    newPassword: string,
    session: string
): Promise<CognitoTokens> {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) throw new Error("COGNITO_CLIENT_ID environment variable is required");

    const command = new RespondToAuthChallengeCommand({
        ClientId: clientId,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: session,
        ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: newPassword,
            SECRET_HASH: await computeSecretHash(username, clientId),
        },
    });

    const result = await client.send(command);
    const auth = result.AuthenticationResult;

    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
        throw new Error("Password change failed");
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

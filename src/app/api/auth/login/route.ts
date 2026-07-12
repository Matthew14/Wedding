import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { signIn, completeNewPassword, isNewPasswordChallenge, type CognitoTokens } from "@/utils/auth/cognito";
import {
    setSessionCookie,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setRefreshUsernameCookie,
} from "@/utils/auth/session";
import * as logger from "@/utils/logger";

// The refresh flow's SECRET_HASH needs the immutable Cognito username (a
// UUID when email is an alias), which only lives in the ID token we just
// minted — capture it now, alongside the refresh token.
function setAuthCookies(response: NextResponse, tokens: CognitoTokens, email: string) {
    response.cookies.set(setSessionCookie(tokens.idToken, tokens.expiresIn));
    response.cookies.set(setAccessTokenCookie(tokens.accessToken, tokens.expiresIn));

    const username = (decodeJwt(tokens.idToken)["cognito:username"] as string | undefined) ?? email;
    response.cookies.set(setRefreshTokenCookie(tokens.refreshToken));
    response.cookies.set(setRefreshUsernameCookie(username));
}

export async function POST(request: NextRequest) {
    let email: string | undefined;
    try {
        const body = await request.json();
        ({ email } = body);
        const { password, newPassword, session } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Complete a NEW_PASSWORD_REQUIRED challenge
        if (newPassword && session) {
            const tokens = await completeNewPassword(email as string, newPassword as string, session as string);
            const response = NextResponse.json({ ok: true });
            setAuthCookies(response, tokens, email as string);
            return response;
        }

        const result = await signIn(email as string, password as string);

        if (isNewPasswordChallenge(result)) {
            logger.info("POST /api/auth/login", "NEW_PASSWORD_REQUIRED challenge", { email });
            return NextResponse.json({
                challenge: "NEW_PASSWORD_REQUIRED",
                session: result.session,
                username: result.username,
            });
        }

        logger.info("POST /api/auth/login", "Login successful", { email });
        const response = NextResponse.json({ ok: true });
        setAuthCookies(response, result, email as string);

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        await logger.error("POST /api/auth/login", "Login failed", { email, message });
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

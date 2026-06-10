import { NextRequest, NextResponse } from "next/server";
import { signIn, completeNewPassword, isNewPasswordChallenge } from "@/utils/auth/cognito";
import { setSessionCookie, setAccessTokenCookie } from "@/utils/auth/session";
import * as logger from "@/utils/logger";

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
            response.cookies.set(setSessionCookie(tokens.idToken, tokens.expiresIn));
            response.cookies.set(setAccessTokenCookie(tokens.accessToken, tokens.expiresIn));
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
        response.cookies.set(setSessionCookie(result.idToken, result.expiresIn));
        response.cookies.set(setAccessTokenCookie(result.accessToken, result.expiresIn));

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        await logger.error("POST /api/auth/login", "Login failed", { email, message });
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

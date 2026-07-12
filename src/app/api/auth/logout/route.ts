import { NextResponse } from "next/server";
import {
    clearSessionCookie,
    clearAccessTokenCookie,
    clearRefreshTokenCookie,
    clearRefreshUsernameCookie,
    getAccessToken,
} from "@/utils/auth/session";
import { signOut } from "@/utils/auth/cognito";

export async function POST() {
    const accessToken = await getAccessToken();

    if (accessToken) {
        try {
            // GlobalSignOut also revokes the refresh token server-side, so a
            // stolen wedding_refresh cookie is dead after an explicit logout.
            await signOut(accessToken);
        } catch {
            // GlobalSignOut failure should not block local session clearing
        }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearSessionCookie());
    response.cookies.set(clearAccessTokenCookie());
    response.cookies.set(clearRefreshTokenCookie());
    response.cookies.set(clearRefreshUsernameCookie());
    return response;
}

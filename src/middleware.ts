import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJWKS, getJWTIssuer } from "@/utils/auth/jwks";
import { refreshTokens } from "@/utils/auth/refresh";
import {
    SESSION_COOKIE,
    ACCESS_TOKEN_COOKIE,
    REFRESH_COOKIE,
    REFRESH_USERNAME_COOKIE,
    setSessionCookie,
    setAccessTokenCookie,
    setRefreshTokenCookie,
} from "@/utils/auth/session";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return false;

    const audience = process.env.COGNITO_CLIENT_ID;
    if (!audience) throw new Error("COGNITO_CLIENT_ID environment variable is required");

    try {
        // Shared issuer/JWKS helper honours COGNITO_ISSUER for local (LocalStack) dev.
        await jwtVerify(token, getJWKS(), { issuer: getJWTIssuer(), audience });
        return true;
    } catch {
        return false;
    }
}

type CookieToSet = ReturnType<typeof setSessionCookie>;

// When the 1-hour session has lapsed but the 30-day refresh token is still
// good, mint fresh tokens. Returns the cookies to attach to the response, or
// null when refresh isn't possible — the caller falls through to login.
async function tryRefresh(request: NextRequest): Promise<CookieToSet[] | null> {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    const username = request.cookies.get(REFRESH_USERNAME_COOKIE)?.value;
    if (!refreshToken || !username) return null;

    const tokens = await refreshTokens(refreshToken, username);
    if (!tokens) return null;

    // Make the fresh session visible to this request's own handlers (route
    // handlers, server components) — the browser only gets the new cookies
    // with the response, after the handlers have already run.
    request.cookies.set(SESSION_COOKIE, tokens.idToken);
    request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);

    return [
        setSessionCookie(tokens.idToken, tokens.expiresIn),
        setAccessTokenCookie(tokens.accessToken, tokens.expiresIn),
        // Only present when the pool rotates refresh tokens.
        ...(tokens.refreshToken ? [setRefreshTokenCookie(tokens.refreshToken)] : []),
    ];
}

export async function middleware(request: NextRequest) {
    let authenticated = await isAuthenticated(request);

    let refreshedCookies: CookieToSet[] | null = null;
    if (!authenticated) {
        refreshedCookies = await tryRefresh(request);
        authenticated = refreshedCookies !== null;
    }

    const withCookies = (response: NextResponse) => {
        refreshedCookies?.forEach((cookie) => response.cookies.set(cookie));
        return response;
    };

    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/dashboard") && !authenticated) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("redirectedFrom", pathname);
        return NextResponse.redirect(redirectUrl);
    }

    if (pathname === "/login" && authenticated) {
        return withCookies(NextResponse.redirect(new URL("/dashboard", request.url)));
    }

    // `{ request }` forwards the mutated request cookies to the handlers.
    return withCookies(NextResponse.next({ request }));
}

export const config = {
    // /api is included so a stale tab's API calls (e.g. approving a photo
    // after sitting open past the session expiry) refresh transparently
    // instead of failing with a 401.
    matcher: ["/dashboard/:path*", "/login", "/api/:path*"],
};

import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJWKS, getJWTIssuer } from "@/utils/auth/jwks";
import { refreshTokens, type RefreshedTokens } from "@/utils/auth/refresh";
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

// De-duplicate refreshes: a stale page load fires several requests at once,
// all carrying the same refresh token, and none of them can see the rotated
// cookies until a response reaches the browser. Sharing one in-flight
// promise (kept briefly after success for stragglers) means one Cognito
// call per burst — and keeps this safe if refresh-token rotation is ever
// enabled on the app client (it's off today, the Cognito default).
const inflightRefreshes = new Map<string, Promise<RefreshedTokens | null>>();
const REFRESH_REUSE_TTL_MS = 30_000;

function dedupedRefresh(refreshToken: string, username: string): Promise<RefreshedTokens | null> {
    const existing = inflightRefreshes.get(refreshToken);
    if (existing) return existing;

    // Evictions check identity, not just the key: the same token value recurs
    // across bursts for the whole 30-day session, and a stale timer from an
    // earlier (failed) attempt must not evict a newer cached entry early.
    const promise = refreshTokens(refreshToken, username).then((tokens) => {
        // Keep successes for the TTL; drop failures so a transient network
        // error doesn't pin "not authenticated" for 30 seconds.
        if (!tokens && inflightRefreshes.get(refreshToken) === promise) {
            inflightRefreshes.delete(refreshToken);
        }
        return tokens;
    });
    inflightRefreshes.set(refreshToken, promise);
    setTimeout(() => {
        if (inflightRefreshes.get(refreshToken) === promise) {
            inflightRefreshes.delete(refreshToken);
        }
    }, REFRESH_REUSE_TTL_MS);
    return promise;
}

// When the 1-hour session has lapsed but the 30-day refresh token is still
// good, mint fresh tokens. Returns the cookies to attach to the response, or
// null when refresh isn't possible — the caller falls through to login.
async function tryRefresh(request: NextRequest): Promise<CookieToSet[] | null> {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    const username = request.cookies.get(REFRESH_USERNAME_COOKIE)?.value;
    if (!refreshToken || !username) return null;

    const tokens = await dedupedRefresh(refreshToken, username);
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

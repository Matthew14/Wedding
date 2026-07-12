import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { getJWKS, getJWTIssuer } from "./jwks";

const SESSION_COOKIE = "wedding_session";

export interface SessionPayload extends JWTPayload {
    email?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const audience = process.env.COGNITO_CLIENT_ID;
    if (!audience) {
        throw new Error("COGNITO_CLIENT_ID environment variable is required");
    }

    try {
        const { payload } = await jwtVerify<SessionPayload>(token, getJWKS(), {
            issuer: getJWTIssuer(),
            audience,
        });
        return payload;
    } catch {
        return null;
    }
}

// The session cookie lives as long as the Cognito ID token (default 1 hour).
// The middleware transparently renews it from the 30-day refresh token
// cookie, so admins only see the login page when the refresh token itself
// has expired or been revoked.
export function setSessionCookie(token: string, maxAge: number) {
    return {
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge,
    };
}

export function clearSessionCookie() {
    return {
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: 0,
    };
}

const ACCESS_TOKEN_COOKIE = "wedding_access";

export function setAccessTokenCookie(token: string, maxAge: number) {
    return {
        name: ACCESS_TOKEN_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge,
    };
}

export function clearAccessTokenCookie() {
    return {
        name: ACCESS_TOKEN_COOKIE,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: 0,
    };
}

export async function getAccessToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

const REFRESH_COOKIE = "wedding_refresh";
const REFRESH_USERNAME_COOKIE = "wedding_refresh_user";

// Matches the user pool client's 30-day refresh token validity.
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export function setRefreshTokenCookie(token: string) {
    return {
        name: REFRESH_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: REFRESH_MAX_AGE,
    };
}

export function clearRefreshTokenCookie() {
    return { ...setRefreshTokenCookie(""), maxAge: 0 };
}

// The immutable Cognito username (the cognito:username claim — a UUID when
// email is an alias). REFRESH_TOKEN_AUTH's SECRET_HASH must be computed from
// it, and it can't be recovered later: the session cookie holding the claim
// is deleted by the browser the moment it expires.
export function setRefreshUsernameCookie(username: string) {
    return {
        name: REFRESH_USERNAME_COOKIE,
        value: username,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: REFRESH_MAX_AGE,
    };
}

export function clearRefreshUsernameCookie() {
    return { ...setRefreshUsernameCookie(""), maxAge: 0 };
}

export { SESSION_COOKIE, ACCESS_TOKEN_COOKIE, REFRESH_COOKIE, REFRESH_USERNAME_COOKIE };

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

// No refresh token flow: the session expires when the Cognito ID token does
// (default 1 hour). Users of the admin dashboard will be silently logged out
// after that window. This is an accepted trade-off for a low-traffic admin UI.
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

export { SESSION_COOKIE, ACCESS_TOKEN_COOKIE };

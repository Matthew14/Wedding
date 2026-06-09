import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { JWKS, JWT_ISSUER } from "./jwks";

const SESSION_COOKIE = "wedding_session";

export interface SessionPayload extends JWTPayload {
    email?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify<SessionPayload>(token, JWKS, {
            issuer: JWT_ISSUER,
            audience: process.env.COGNITO_CLIENT_ID,
        });
        return payload;
    } catch {
        return null;
    }
}

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

export { SESSION_COOKIE };

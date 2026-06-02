import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const SESSION_COOKIE = "wedding_session";

export interface SessionPayload extends JWTPayload {
    email?: string;
}

function getJwks() {
    const region = process.env.AWS_REGION ?? "eu-west-1";
    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const url = new URL(
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    );
    return createRemoteJWKSet(url);
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify<SessionPayload>(token, getJwks(), {
            issuer: `https://cognito-idp.${process.env.AWS_REGION ?? "eu-west-1"}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
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

import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const region = process.env.AWS_REGION ?? "eu-west-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID;

if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is required");
}

const JWKS = createRemoteJWKSet(
    new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`)
);

const JWT_ISSUER = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get("wedding_session")?.value;
    if (!token) return false;

    const audience = process.env.COGNITO_CLIENT_ID;
    if (!audience) {
        throw new Error("COGNITO_CLIENT_ID environment variable is required");
    }

    try {
        await jwtVerify(token, JWKS, {
            issuer: JWT_ISSUER,
            audience,
        });
        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const authenticated = await isAuthenticated(request);

    if (request.nextUrl.pathname.startsWith("/dashboard")) {
        if (!authenticated) {
            const redirectUrl = new URL("/login", request.url);
            redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
        }
    }

    if (request.nextUrl.pathname === "/login" && authenticated) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};

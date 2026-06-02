import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

function getJwks() {
    const region = process.env.AWS_REGION ?? "eu-west-1";
    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const url = new URL(
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    );
    return createRemoteJWKSet(url);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get("wedding_session")?.value;
    if (!token) return false;

    try {
        await jwtVerify(token, getJwks(), {
            issuer: `https://cognito-idp.${process.env.AWS_REGION ?? "eu-west-1"}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
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

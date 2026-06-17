import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJWKS, getJWTIssuer } from "@/utils/auth/jwks";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get("wedding_session")?.value;
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

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

export type AuthResult =
    | { success: true; payload: JWTPayload }
    | { success: false; response: NextResponse };

function getJwks() {
    const region = process.env.AWS_REGION ?? "eu-west-1";
    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const url = new URL(
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    );
    return createRemoteJWKSet(url);
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
    const token = request.cookies.get("wedding_session")?.value;

    if (!token) {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    try {
        const { payload } = await jwtVerify(token, getJwks(), {
            issuer: `https://cognito-idp.${process.env.AWS_REGION ?? "eu-west-1"}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        });
        return { success: true, payload };
    } catch {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import { getJWKS, getJWTIssuer } from "./jwks";

export type AuthResult =
    | { success: true; payload: JWTPayload }
    | { success: false; response: NextResponse };

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
    const token = request.cookies.get("wedding_session")?.value;

    if (!token) {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const audience = process.env.COGNITO_CLIENT_ID;
    if (!audience) {
        throw new Error("COGNITO_CLIENT_ID environment variable is required");
    }

    try {
        const { payload } = await jwtVerify(token, getJWKS(), {
            issuer: getJWTIssuer(),
            audience,
        });
        return { success: true, payload };
    } catch {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
}

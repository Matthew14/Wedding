import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import { JWKS, JWT_ISSUER } from "./jwks";

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

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: JWT_ISSUER,
            audience: process.env.COGNITO_CLIENT_ID,
        });
        return { success: true, payload };
    } catch {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
}

import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/utils/auth/cognito";
import { setSessionCookie } from "@/utils/auth/session";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const tokens = await signIn(email as string, password as string);

        const response = NextResponse.json({ ok: true });
        const cookie = setSessionCookie(tokens.idToken, tokens.expiresIn);
        response.cookies.set(cookie);

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

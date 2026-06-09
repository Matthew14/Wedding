import { NextResponse } from "next/server";
import { clearSessionCookie, clearAccessTokenCookie, getAccessToken } from "@/utils/auth/session";
import { signOut } from "@/utils/auth/cognito";

export async function POST() {
    const accessToken = await getAccessToken();

    if (accessToken) {
        try {
            await signOut(accessToken);
        } catch {
            // GlobalSignOut failure should not block local session clearing
        }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearSessionCookie());
    response.cookies.set(clearAccessTokenCookie());
    return response;
}

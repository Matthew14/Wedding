import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/utils/auth/session";

export async function POST() {
    const response = NextResponse.json({ ok: true });
    const cookie = clearSessionCookie();
    response.cookies.set(cookie);
    return response;
}

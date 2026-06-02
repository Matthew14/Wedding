import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    return NextResponse.json({ email: auth.payload.email ?? null });
}

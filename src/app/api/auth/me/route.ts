import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    return NextResponse.json({
        email: auth.payload.email ?? null,
        // The bride & groom's master invitation code — the gallery and
        // upload pages auto-fill it for logged-in admins.
        masterCode: process.env.MASTER_INVITATION_CODE ?? null,
    });
}

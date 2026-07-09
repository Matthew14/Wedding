import { NextRequest, NextResponse } from "next/server";
import { listInvitationCodes } from "@/utils/db/archive";
import { requireAuth } from "@/utils/auth/requireAuth";

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const codes = await listInvitationCodes();
        return NextResponse.json({ codes });
    } catch (error) {
        console.error("Error in GET /api/dashboard/invitation-codes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

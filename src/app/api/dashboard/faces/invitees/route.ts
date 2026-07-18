import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";
import { listAllInvitees } from "@/utils/db/archive";

// Invitee list for the cluster-assignment picker.
export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        return NextResponse.json({ invitees: await listAllInvitees() });
    } catch (error) {
        console.error("Error in GET /api/dashboard/faces/invitees:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

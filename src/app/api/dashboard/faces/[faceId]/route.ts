import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";
import { detachFace } from "@/utils/db/faces";

interface PatchBody {
    detach?: boolean;
}

// Reject a single face from its person/cluster: it becomes an unassigned
// singleton (see detachFace). This is the "that's not them" button on the
// per-person verification tab.
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ faceId: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { faceId } = await params;
        const body: PatchBody = await request.json();
        if (body.detach !== true) {
            return NextResponse.json(
                { error: "Body must set detach: true" },
                { status: 400 }
            );
        }

        const found = await detachFace(faceId);
        if (!found) {
            return NextResponse.json({ error: "Face not found" }, { status: 404 });
        }
        return NextResponse.json({ face_id: faceId, detached: true });
    } catch (error) {
        console.error("Error in PATCH /api/dashboard/faces/[faceId]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { updatePhotoModeration } from "@/utils/db/photos";
import { requireAuth } from "@/utils/auth/requireAuth";

interface PatchBody {
    status: "approved" | "rejected";
    categoryId?: string;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body: PatchBody = await request.json();
        const { status, categoryId } = body;

        if (status !== "approved" && status !== "rejected") {
            return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
        }

        const approvedBy = (auth.payload.email as string | undefined) ?? null;

        const found = await updatePhotoModeration(id, {
            status,
            categoryId: categoryId ?? null,
            approvedBy,
        });

        if (!found) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        return NextResponse.json({ id, status });
    } catch (error) {
        console.error("Error in PATCH /api/photos/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

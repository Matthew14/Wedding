import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
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

        const db = getDb();
        const { rows } = await db.query<{ id: string }>(
            `UPDATE photos
             SET status = $1,
                 category_id = COALESCE($2::uuid, category_id),
                 approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
                 approved_by = CASE WHEN $1 = 'approved' THEN $3 ELSE approved_by END
             WHERE id = $4
             RETURNING id`,
            [status, categoryId ?? null, approvedBy, id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        return NextResponse.json({ id: rows[0].id, status });
    } catch (error) {
        console.error("Error in PATCH /api/photos/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

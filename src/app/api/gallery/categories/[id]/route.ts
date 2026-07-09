import { NextRequest, NextResponse } from "next/server";
import { updateCategory, type UpdateCategoryInput } from "@/utils/db/categories";
import { requireAuth } from "@/utils/auth/requireAuth";
import * as logger from "@/utils/logger";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body = await request.json();

        if ("slug" in body) {
            return NextResponse.json(
                { error: "slug cannot be changed — it's the public URL key" },
                { status: 400 }
            );
        }

        const fields: UpdateCategoryInput = {};
        if (body.name !== undefined) {
            if (typeof body.name !== "string" || !body.name.trim()) {
                return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
            }
            fields.name = body.name.trim();
        }
        if (body.description !== undefined) {
            if (body.description !== null && typeof body.description !== "string") {
                return NextResponse.json({ error: "description must be a string or null" }, { status: 400 });
            }
            fields.description = body.description === null ? null : body.description.trim() || null;
        }
        if (body.sort_order !== undefined) {
            if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) {
                return NextResponse.json({ error: "sort_order must be a number" }, { status: 400 });
            }
            fields.sort_order = body.sort_order;
        }

        if (Object.keys(fields).length === 0) {
            return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
        }

        const category = await updateCategory(id, fields);
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        return NextResponse.json({ category });
    } catch (error) {
        await logger.error("PATCH /api/gallery/categories/[id]", "DB update failed", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

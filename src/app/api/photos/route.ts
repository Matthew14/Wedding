import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { Photo } from "@/types/photos";

interface PhotoRow extends Photo {
    category_slug: string | null;
    thumbnail_url?: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const categorySlug = searchParams.get("category");
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
        const offset = (page - 1) * limit;

        // Admin can request any status; public requests only see approved
        const requestedStatus = searchParams.get("status");
        let status = "approved";
        if (requestedStatus && ["pending", "approved", "rejected"].includes(requestedStatus)) {
            if (requestedStatus !== "approved") {
                const auth = await requireAuth(request);
                if (!auth.success) return auth.response;
            }
            status = requestedStatus;
        }

        const db = getDb();

        let sql: string;
        let params: (string | number)[];

        if (categorySlug) {
            sql = `SELECT p.*, pc.slug AS category_slug
                   FROM photos p
                   LEFT JOIN photo_categories pc ON pc.id = p.category_id
                   WHERE p.status = $1 AND pc.slug = $2
                   ORDER BY p.uploaded_at DESC
                   LIMIT $3 OFFSET $4`;
            params = [status, categorySlug, limit, offset];
        } else {
            sql = `SELECT p.*, pc.slug AS category_slug
                   FROM photos p
                   LEFT JOIN photo_categories pc ON pc.id = p.category_id
                   WHERE p.status = $1
                   ORDER BY p.uploaded_at DESC
                   LIMIT $2 OFFSET $3`;
            params = [status, limit, offset];
        }

        const { rows } = await db.query<PhotoRow>(sql, params);

        const countSql = categorySlug
            ? `SELECT COUNT(*)::int AS total FROM photos p
               LEFT JOIN photo_categories pc ON pc.id = p.category_id
               WHERE p.status = $1 AND pc.slug = $2`
            : `SELECT COUNT(*)::int AS total FROM photos WHERE status = $1`;
        const countParams = categorySlug ? [status, categorySlug] : [status];
        const { rows: countRows } = await db.query<{ total: number }>(countSql, countParams);
        const total = countRows[0]?.total ?? 0;

        const photos = rows.map((p) => ({
            ...p,
            thumbnail_url: p.thumbnail_key ? cdnUrl(p.thumbnail_key) : null,
        }));

        return NextResponse.json({ photos, page, limit, total });
    } catch (error) {
        console.error("Error in GET /api/photos:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { PhotoCategory } from "@/types/photos";

interface CategoryRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    event_day: "friday" | "saturday" | "sunday" | null;
    cover_photo_id: string | null;
    sort_order: number;
    cover_thumbnail_key: string | null;
}

export async function GET() {
    try {
        const db = getDb();
        const { rows } = await db.query<CategoryRow>(
            `SELECT pc.id, pc.name, pc.slug, pc.description, pc.event_day,
                    pc.cover_photo_id, pc.sort_order,
                    p.thumbnail_key AS cover_thumbnail_key
             FROM photo_categories pc
             LEFT JOIN photos p ON p.id = pc.cover_photo_id
             ORDER BY pc.sort_order`
        );

        const categories: PhotoCategory[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            description: r.description,
            event_day: r.event_day,
            cover_photo_id: r.cover_photo_id,
            sort_order: r.sort_order,
            cover_thumbnail_url: r.cover_thumbnail_key ? cdnUrl(r.cover_thumbnail_key) : null,
        }));

        return NextResponse.json({ categories });
    } catch (error) {
        console.error("Error in GET /api/gallery/categories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { name, slug, description, event_day, sort_order } = await request.json();

        if (!name || !slug) {
            return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
        }

        const db = getDb();
        const { rows } = await db.query<CategoryRow>(
            `INSERT INTO photo_categories (name, slug, description, event_day, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), slug.trim(), description ?? null, event_day ?? null, sort_order ?? 0]
        );

        return NextResponse.json({ category: rows[0] }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/gallery/categories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

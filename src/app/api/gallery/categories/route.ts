import { NextRequest, NextResponse } from "next/server";
import { listCategories, createCategory } from "@/utils/db/categories";
import { getPhotoById } from "@/utils/db/photos";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { PhotoCategory } from "@/types/photos";

export async function GET() {
    try {
        const rows = await listCategories();

        // Resolve cover thumbnails from the photos table (few categories, so
        // per-cover lookups are fine).
        const categories: PhotoCategory[] = await Promise.all(
            rows.map(async (r) => {
                const cover = r.cover_photo_id ? await getPhotoById(r.cover_photo_id) : null;
                return {
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    description: r.description,
                    event_day: r.event_day,
                    cover_photo_id: r.cover_photo_id,
                    sort_order: r.sort_order,
                    cover_thumbnail_url: cover?.thumbnail_key ? cdnUrl(cover.thumbnail_key) : null,
                };
            })
        );

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

        const category = await createCategory({
            name: name.trim(),
            slug: slug.trim(),
            description: description ?? null,
            event_day: event_day ?? null,
            sort_order: sort_order ?? 0,
        });

        if (category === "duplicate-slug") {
            return NextResponse.json({ error: "A category with that slug already exists" }, { status: 409 });
        }

        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/gallery/categories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

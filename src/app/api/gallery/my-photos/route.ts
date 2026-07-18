import { NextRequest, NextResponse } from "next/server";
import {
    isValidInvitationCode,
    getInvitationIdByCode,
    getInviteesWithIds,
} from "@/utils/db/archive";
import { getFacesByInvitees } from "@/utils/db/faces";
import { getPhotosByIds } from "@/utils/db/photos";
import { listCategories } from "@/utils/db/categories";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { PublicPhoto } from "@/types/photos";

// Approved photos in which anyone in the caller's household (the invitees
// behind their invitation code) appears, per the labeled face clusters.
// Same auth gate and response envelope as /api/photos so the gallery
// components drop in unchanged.
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "200", 10)));
        const offset = (page - 1) * limit;

        const code = searchParams.get("code")?.trim().toUpperCase() ?? "";
        const auth = await requireAuth(request);
        if (!auth.success && (!code || !(await isValidInvitationCode(code)))) {
            return NextResponse.json(
                { error: "A valid invitation code is required" },
                { status: 401 }
            );
        }

        // The master code (and an admin session without a code) has no
        // archived household behind it — nothing to match, empty result.
        const invitationId = code ? await getInvitationIdByCode(code) : null;
        if (invitationId === null) {
            return NextResponse.json({ photos: [], invitees: [], page, limit, total: 0 });
        }

        const invitees = await getInviteesWithIds(invitationId);
        const faces = await getFacesByInvitees(invitees.map((i) => i.id));
        const photoIds = [...new Set(faces.map((f) => f.photo_id))];

        const [matched, categories] = await Promise.all([
            getPhotosByIds(photoIds),
            listCategories(),
        ]);
        const slugById = new Map(categories.map((c) => [c.id, c.slug]));

        // Approved-only at read time: pending/rejected photos never leak, and
        // moderation changes need no face-row cleanup.
        const approved = matched
            .filter((p) => p.status === "approved")
            .sort((a, b) =>
                (b.taken_at ?? b.uploaded_at).localeCompare(a.taken_at ?? a.uploaded_at)
            );

        const photos: PublicPhoto[] = approved.slice(offset, offset + limit).map((p) => ({
            id: p.id,
            thumbnail_url: p.thumbnail_key ? cdnUrl(p.thumbnail_key) : null,
            width: p.width,
            height: p.height,
            file_name: p.file_name,
            taken_at: p.taken_at,
            category_id: p.category_id,
            category_slug: p.category_id ? (slugById.get(p.category_id) ?? null) : null,
            uploaded_at: p.uploaded_at,
        }));

        return NextResponse.json({
            photos,
            invitees: invitees.map((i) => i.first_name),
            page,
            limit,
            total: approved.length,
        });
    } catch (error) {
        console.error("Error in GET /api/gallery/my-photos:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

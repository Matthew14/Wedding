import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";
import { getFacesByInvitees } from "@/utils/db/faces";
import { getPhotosByIds } from "@/utils/db/photos";
import { cdnUrl } from "@/utils/storage";
import type { FaceView } from "@/types/faces";

// Every face currently attributed to an invitee (across all their clusters),
// for the per-person verification tab.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const inviteeId = Number(id);
        if (!Number.isInteger(inviteeId)) {
            return NextResponse.json({ error: "Invalid invitee id" }, { status: 400 });
        }

        const faces = await getFacesByInvitees([inviteeId]);
        const photos = await getPhotosByIds([...new Set(faces.map((f) => f.photo_id))]);
        const photoById = new Map(photos.map((p) => [p.id, p]));

        const views: FaceView[] = faces
            // Lowest confidence first: the faces most likely to be wrong are
            // the ones the admin should see at the top.
            .sort((a, b) => a.confidence - b.confidence)
            .map((f) => {
                const photo = photoById.get(f.photo_id);
                return {
                    face_id: f.face_id,
                    photo_id: f.photo_id,
                    thumbnail_url: photo?.thumbnail_key ? cdnUrl(photo.thumbnail_key) : null,
                    thumbnail_width: photo?.width ?? null,
                    thumbnail_height: photo?.height ?? null,
                    bounding_box: f.bounding_box,
                    confidence: f.confidence,
                };
            });

        return NextResponse.json({ invitee_id: inviteeId, faces: views });
    } catch (error) {
        console.error("Error in GET /api/dashboard/faces/by-invitee/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

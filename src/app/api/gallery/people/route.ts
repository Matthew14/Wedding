import { NextRequest, NextResponse } from "next/server";
import { isValidInvitationCode, listAllInvitees } from "@/utils/db/archive";
import { listAllFaces } from "@/utils/db/faces";
import { listPhotosByStatus } from "@/utils/db/photos";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { GalleryPerson } from "@/types/faces";
import type { PhotoFace } from "@/types/faces";

// The searchable people list for the gallery: everyone with at least one
// assigned face, with their highest-confidence face as the headshot. Same
// code gate as the rest of the gallery — this is guest-visible by design
// (guests search for each other), but only behind a valid invitation code.
export async function GET(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        if (!auth.success) {
            const code = new URL(request.url).searchParams
                .get("code")
                ?.trim()
                .toUpperCase();
            if (!code || !(await isValidInvitationCode(code))) {
                return NextResponse.json(
                    { error: "A valid invitation code is required" },
                    { status: 401 }
                );
            }
        }

        const [faces, invitees, approvedPhotos] = await Promise.all([
            listAllFaces(),
            listAllInvitees(),
            listPhotosByStatus("approved"),
        ]);
        const nameById = new Map(invitees.map((i) => [i.id, i.name]));
        const photoById = new Map(approvedPhotos.map((p) => [p.id, p]));

        // Best (highest-confidence) face and distinct photo count per person —
        // approved photos only, so the advertised count matches what selecting
        // the person in the gallery (which serves approved photos) shows.
        const bestFace = new Map<number, PhotoFace>();
        const photoIds = new Map<number, Set<string>>();
        for (const face of faces) {
            if (face.invitee_id == null || face.ignored) continue;
            if (!photoById.has(face.photo_id)) continue; // pending/rejected
            const current = bestFace.get(face.invitee_id);
            if (!current || face.confidence > current.confidence) {
                bestFace.set(face.invitee_id, face);
            }
            const ids = photoIds.get(face.invitee_id) ?? new Set<string>();
            ids.add(face.photo_id);
            photoIds.set(face.invitee_id, ids);
        }

        const people: GalleryPerson[] = [...bestFace.entries()]
            .map(([inviteeId, face]) => {
                const photo = photoById.get(face.photo_id);
                return {
                    invitee_id: inviteeId,
                    name: nameById.get(inviteeId) ?? "Guest",
                    photo_count: photoIds.get(inviteeId)?.size ?? 0,
                    face: {
                        face_id: face.face_id,
                        photo_id: face.photo_id,
                        thumbnail_url: photo?.thumbnail_key ? cdnUrl(photo.thumbnail_key) : null,
                        thumbnail_width: photo?.width ?? null,
                        thumbnail_height: photo?.height ?? null,
                        bounding_box: face.bounding_box,
                        confidence: face.confidence,
                    },
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ people });
    } catch (error) {
        console.error("Error in GET /api/gallery/people:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

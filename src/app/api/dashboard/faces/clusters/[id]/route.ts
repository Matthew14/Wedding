import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";
import { getFacesByCluster, updateClusterAssignment } from "@/utils/db/faces";
import { listAllInvitees } from "@/utils/db/archive";
import { getPhotosByIds } from "@/utils/db/photos";
import { cdnUrl } from "@/utils/storage";
import type { ClusterDetailResponse } from "@/types/faces";

// Every face in a cluster, for the sanity-check modal before assigning.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const faces = await getFacesByCluster(id);
        if (faces.length === 0) {
            return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
        }

        const photos = await getPhotosByIds([...new Set(faces.map((f) => f.photo_id))]);
        const photoById = new Map(photos.map((p) => [p.id, p]));
        const assigned = faces.find((f) => f.invitee_id != null);
        const inviteeName = assigned
            ? ((await listAllInvitees()).find((i) => i.id === assigned.invitee_id)?.name ?? null)
            : null;

        const response: ClusterDetailResponse = {
            cluster_id: id,
            invitee_id: assigned?.invitee_id ?? null,
            invitee_name: inviteeName,
            ignored: faces.some((f) => f.ignored),
            faces: faces
                .sort((a, b) => b.confidence - a.confidence)
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
                }),
        };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in GET /api/dashboard/faces/clusters/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

interface PatchBody {
    invitee_id?: number | null;
    ignored?: boolean;
}

// Assign the cluster to an invitee, mark it ignored, or clear it
// (invitee_id: null). The server resolves invitation_id from the archive so
// the byInvitee GSI rows stay consistent with the household lookup.
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body: PatchBody = await request.json();

        let updated: number;
        if (body.ignored === true) {
            updated = await updateClusterAssignment(id, { ignored: true });
        } else if (body.invitee_id === null) {
            updated = await updateClusterAssignment(id, null);
        } else if (typeof body.invitee_id === "number") {
            const invitee = (await listAllInvitees()).find((i) => i.id === body.invitee_id);
            if (!invitee) {
                return NextResponse.json({ error: "Unknown invitee" }, { status: 400 });
            }
            updated = await updateClusterAssignment(id, {
                invitee_id: invitee.id,
                invitation_id: invitee.invitation_id,
            });
        } else {
            return NextResponse.json(
                { error: "Body must set invitee_id (number or null) or ignored: true" },
                { status: 400 }
            );
        }

        if (updated === 0) {
            return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
        }
        return NextResponse.json({ cluster_id: id, updated });
    } catch (error) {
        console.error("Error in PATCH /api/dashboard/faces/clusters/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

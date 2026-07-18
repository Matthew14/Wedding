import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth/requireAuth";
import { listAllFaces } from "@/utils/db/faces";
import { listAllInvitees } from "@/utils/db/archive";
import { getPhotosByIds } from "@/utils/db/photos";
import { cdnUrl } from "@/utils/storage";
import type { PhotoFace } from "@/types/faces";
import type { ClustersResponse, ClusterSummary } from "@/types/faces";

// Cluster overview for the labeling page: one entry per cluster with its
// highest-confidence face as the representative crop.
export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const [faces, invitees] = await Promise.all([listAllFaces(), listAllInvitees()]);
        const inviteeNames = new Map(invitees.map((i) => [i.id, i.name]));

        const byCluster = new Map<string, PhotoFace[]>();
        let unclusteredFaces = 0;
        for (const face of faces) {
            // Rows indexed but not yet clustered (backfill Phase A only).
            if (!face.cluster_id) {
                unclusteredFaces++;
                continue;
            }
            const list = byCluster.get(face.cluster_id) ?? [];
            list.push(face);
            byCluster.set(face.cluster_id, list);
        }

        // One thumbnail lookup per cluster (its rep face), not per face.
        const repFaces = new Map(
            [...byCluster.entries()].map(([clusterId, clusterFaces]) => [
                clusterId,
                clusterFaces.reduce((best, f) => (f.confidence > best.confidence ? f : best)),
            ])
        );
        const photos = await getPhotosByIds([
            ...new Set([...repFaces.values()].map((f) => f.photo_id)),
        ]);
        const photoById = new Map(photos.map((p) => [p.id, p]));

        const clusters: ClusterSummary[] = [...byCluster.entries()].map(
            ([clusterId, clusterFaces]) => {
                const rep = repFaces.get(clusterId)!;
                const photo = photoById.get(rep.photo_id);
                // Any face in the cluster carries the assignment (denormalized).
                const assigned = clusterFaces.find((f) => f.invitee_id != null);
                return {
                    cluster_id: clusterId,
                    face_count: clusterFaces.length,
                    invitee_id: assigned?.invitee_id ?? null,
                    invitee_name: assigned ? (inviteeNames.get(assigned.invitee_id!) ?? null) : null,
                    ignored: clusterFaces.some((f) => f.ignored),
                    rep_face: {
                        face_id: rep.face_id,
                        photo_id: rep.photo_id,
                        thumbnail_url: photo?.thumbnail_key ? cdnUrl(photo.thumbnail_key) : null,
                        thumbnail_width: photo?.width ?? null,
                        thumbnail_height: photo?.height ?? null,
                        bounding_box: rep.bounding_box,
                        confidence: rep.confidence,
                    },
                };
            }
        );

        // Unassigned first (that's the work queue), biggest clusters first
        // within each group so the most valuable labeling happens early.
        clusters.sort((a, b) => {
            const aDone = a.invitee_id != null || a.ignored ? 1 : 0;
            const bDone = b.invitee_id != null || b.ignored ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;
            return b.face_count - a.face_count;
        });

        const ignored = clusters.filter((c) => c.ignored).length;
        const response: ClustersResponse = {
            clusters,
            progress: {
                total: clusters.length - ignored,
                assigned: clusters.filter((c) => c.invitee_id != null).length,
                ignored,
                unclustered_faces: unclusteredFaces,
            },
        };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in GET /api/dashboard/faces/clusters:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();
const mockListAllFaces = vi.fn();
const mockListAllInvitees = vi.fn();
const mockGetPhotosByIds = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    listAllFaces: (...args: unknown[]) => mockListAllFaces(...args),
}));
vi.mock("@/utils/db/archive", () => ({
    listAllInvitees: (...args: unknown[]) => mockListAllInvitees(...args),
}));
vi.mock("@/utils/db/photos", () => ({
    getPhotosByIds: (...args: unknown[]) => mockGetPhotosByIds(...args),
}));
vi.mock("@/utils/storage", () => ({
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

const face = (over: Record<string, unknown>) => ({
    face_id: "f",
    photo_id: "p1",
    cluster_id: "c1",
    bounding_box: { left: 0.1, top: 0.1, width: 0.2, height: 0.2 },
    confidence: 99,
    indexed_at: "2026-07-18T00:00:00Z",
    ...over,
});

describe("GET /api/dashboard/faces/clusters", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
        mockListAllInvitees.mockResolvedValue([
            { id: 7, invitation_id: 3, name: "Aoife Byrne", code: "ABC123" },
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            { id: "p1", thumbnail_key: "uploads/thumbnail/x/p1.jpg", width: 1200, height: 800 },
        ]);
    });

    it("requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/clusters"));
        expect(res.status).toBe(401);
        expect(mockListAllFaces).not.toHaveBeenCalled();
    });

    it("groups faces into clusters with counts and the highest-confidence rep face", async () => {
        mockListAllFaces.mockResolvedValue([
            face({ face_id: "f1", confidence: 90 }),
            face({ face_id: "f2", confidence: 99.5 }),
            face({ face_id: "f3", cluster_id: "c2" }),
        ]);
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/clusters"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.clusters).toHaveLength(2);
        const c1 = body.clusters.find(
            (c: { cluster_id: string }) => c.cluster_id === "c1"
        );
        expect(c1.face_count).toBe(2);
        expect(c1.rep_face.face_id).toBe("f2");
        expect(c1.rep_face.thumbnail_url).toBe("https://cdn/uploads/thumbnail/x/p1.jpg");
        expect(c1.rep_face.thumbnail_width).toBe(1200);
    });

    it("orders unassigned clusters before labeled ones, biggest first", async () => {
        mockListAllFaces.mockResolvedValue([
            face({ face_id: "f1", cluster_id: "assigned", invitee_id: 7, invitation_id: 3 }),
            face({ face_id: "f2", cluster_id: "big" }),
            face({ face_id: "f3", cluster_id: "big" }),
            face({ face_id: "f4", cluster_id: "small" }),
        ]);
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/clusters"));
        const body = await res.json();
        expect(
            body.clusters.map((c: { cluster_id: string }) => c.cluster_id)
        ).toEqual(["big", "small", "assigned"]);
    });

    it("resolves invitee names and reports progress, counting unclustered faces", async () => {
        mockListAllFaces.mockResolvedValue([
            face({ face_id: "f1", cluster_id: "c1", invitee_id: 7, invitation_id: 3 }),
            face({ face_id: "f2", cluster_id: "c2", ignored: true }),
            face({ face_id: "f3", cluster_id: "c3" }),
            face({ face_id: "f4", cluster_id: undefined }),
        ]);
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/clusters"));
        const body = await res.json();

        const c1 = body.clusters.find(
            (c: { cluster_id: string }) => c.cluster_id === "c1"
        );
        expect(c1.invitee_name).toBe("Aoife Byrne");
        expect(body.progress).toEqual({
            total: 2, // c1 + c3; ignored c2 excluded
            assigned: 1,
            ignored: 1,
            unclustered_faces: 1,
        });
    });
});

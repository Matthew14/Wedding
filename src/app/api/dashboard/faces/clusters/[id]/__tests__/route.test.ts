import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "../route";

const mockRequireAuth = vi.fn();
const mockGetFacesByCluster = vi.fn();
const mockUpdateClusterAssignment = vi.fn();
const mockListAllInvitees = vi.fn();
const mockGetPhotosByIds = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    getFacesByCluster: (...args: unknown[]) => mockGetFacesByCluster(...args),
    updateClusterAssignment: (...args: unknown[]) => mockUpdateClusterAssignment(...args),
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

const params = { params: Promise.resolve({ id: "c1" }) };

const patchReq = (body: unknown) =>
    new NextRequest("http://localhost/api/dashboard/faces/clusters/c1", {
        method: "PATCH",
        body: JSON.stringify(body),
    });

describe("/api/dashboard/faces/clusters/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
        mockListAllInvitees.mockResolvedValue([
            { id: 7, invitation_id: 3, name: "Aoife Byrne", code: "ABC123" },
        ]);
        mockGetPhotosByIds.mockResolvedValue([]);
        mockUpdateClusterAssignment.mockResolvedValue(2);
    });

    it("GET requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await GET(
            new NextRequest("http://localhost/api/dashboard/faces/clusters/c1"),
            params
        );
        expect(res.status).toBe(401);
    });

    it("GET returns 404 for an unknown cluster", async () => {
        mockGetFacesByCluster.mockResolvedValue([]);
        const res = await GET(
            new NextRequest("http://localhost/api/dashboard/faces/clusters/c1"),
            params
        );
        expect(res.status).toBe(404);
    });

    it("GET returns faces sorted by confidence with crop data", async () => {
        mockGetFacesByCluster.mockResolvedValue([
            {
                face_id: "low",
                photo_id: "p1",
                cluster_id: "c1",
                bounding_box: { left: 0, top: 0, width: 0.1, height: 0.1 },
                confidence: 80,
            },
            {
                face_id: "high",
                photo_id: "p1",
                cluster_id: "c1",
                bounding_box: { left: 0.5, top: 0.5, width: 0.1, height: 0.1 },
                confidence: 99,
            },
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            { id: "p1", thumbnail_key: "t/p1.jpg", width: 1200, height: 800 },
        ]);
        const res = await GET(
            new NextRequest("http://localhost/api/dashboard/faces/clusters/c1"),
            params
        );
        const body = await res.json();
        expect(body.faces.map((f: { face_id: string }) => f.face_id)).toEqual(["high", "low"]);
        expect(body.faces[0].thumbnail_url).toBe("https://cdn/t/p1.jpg");
    });

    it("PATCH assign resolves invitation_id from the archive", async () => {
        const res = await PATCH(patchReq({ invitee_id: 7 }), params);
        expect(res.status).toBe(200);
        expect(mockUpdateClusterAssignment).toHaveBeenCalledWith("c1", {
            invitee_id: 7,
            invitation_id: 3,
        });
        expect(await res.json()).toEqual({ cluster_id: "c1", updated: 2 });
    });

    it("PATCH rejects an unknown invitee", async () => {
        const res = await PATCH(patchReq({ invitee_id: 999 }), params);
        expect(res.status).toBe(400);
        expect(mockUpdateClusterAssignment).not.toHaveBeenCalled();
    });

    it("PATCH ignore marks the cluster ignored", async () => {
        const res = await PATCH(patchReq({ ignored: true }), params);
        expect(res.status).toBe(200);
        expect(mockUpdateClusterAssignment).toHaveBeenCalledWith("c1", { ignored: true });
    });

    it("PATCH invitee_id null clears the assignment", async () => {
        const res = await PATCH(patchReq({ invitee_id: null }), params);
        expect(res.status).toBe(200);
        expect(mockUpdateClusterAssignment).toHaveBeenCalledWith("c1", null);
    });

    it("PATCH rejects a body with neither field", async () => {
        const res = await PATCH(patchReq({}), params);
        expect(res.status).toBe(400);
    });

    it("PATCH returns 404 when the cluster has no faces", async () => {
        mockUpdateClusterAssignment.mockResolvedValue(0);
        const res = await PATCH(patchReq({ ignored: true }), params);
        expect(res.status).toBe(404);
    });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();
const mockGetFacesByInvitees = vi.fn();
const mockGetPhotosByIds = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    getFacesByInvitees: (...args: unknown[]) => mockGetFacesByInvitees(...args),
}));
vi.mock("@/utils/db/photos", () => ({
    getPhotosByIds: (...args: unknown[]) => mockGetPhotosByIds(...args),
}));
vi.mock("@/utils/storage", () => ({
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new NextRequest("http://localhost/api/dashboard/faces/by-invitee/7");

describe("GET /api/dashboard/faces/by-invitee/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        mockGetPhotosByIds.mockResolvedValue([
            { id: "p1", thumbnail_key: "t/p1.jpg", width: 1200, height: 800 },
        ]);
    });

    it("requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await GET(req(), params("7"));
        expect(res.status).toBe(401);
        expect(mockGetFacesByInvitees).not.toHaveBeenCalled();
    });

    it("rejects a non-numeric id", async () => {
        const res = await GET(req(), params("clusters"));
        expect(res.status).toBe(400);
    });

    it("returns the person's faces, least detection-confidence first, with crop data", async () => {
        mockGetFacesByInvitees.mockResolvedValue([
            {
                face_id: "sharp",
                photo_id: "p1",
                bounding_box: { left: 0.1, top: 0.1, width: 0.2, height: 0.2 },
                confidence: 99,
            },
            {
                face_id: "blurry",
                photo_id: "p1",
                bounding_box: { left: 0.5, top: 0.5, width: 0.1, height: 0.1 },
                confidence: 71,
            },
        ]);
        const res = await GET(req(), params("7"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(mockGetFacesByInvitees).toHaveBeenCalledWith([7]);
        expect(body.faces.map((f: { face_id: string }) => f.face_id)).toEqual([
            "blurry",
            "sharp",
        ]);
        expect(body.faces[0].thumbnail_url).toBe("https://cdn/t/p1.jpg");
        expect(body.faces[0].thumbnail_width).toBe(1200);
    });

    it("returns an empty list for a person with no faces", async () => {
        mockGetFacesByInvitees.mockResolvedValue([]);
        const body = await (await GET(req(), params("7"))).json();
        expect(body.faces).toEqual([]);
    });
});

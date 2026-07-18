import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();
const mockIsValidInvitationCode = vi.fn();
const mockListAllInvitees = vi.fn();
const mockListAllFaces = vi.fn();
const mockGetPhotosByIds = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/archive", () => ({
    isValidInvitationCode: (...args: unknown[]) => mockIsValidInvitationCode(...args),
    listAllInvitees: (...args: unknown[]) => mockListAllInvitees(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    listAllFaces: (...args: unknown[]) => mockListAllFaces(...args),
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
    confidence: 90,
    indexed_at: "2026-07-18T00:00:00Z",
    ...over,
});

const req = (qs = "") => new NextRequest(`http://localhost/api/gallery/people${qs}`);

describe("GET /api/gallery/people", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        mockIsValidInvitationCode.mockResolvedValue(true);
        mockListAllInvitees.mockResolvedValue([
            { id: 7, invitation_id: 3, name: "Aoife Byrne", code: "ABC123" },
            { id: -3, invitation_id: -1, name: "Maggie", code: null },
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            { id: "p1", thumbnail_key: "t/p1.jpg", width: 1200, height: 800 },
        ]);
    });

    it("rejects requests without a valid code", async () => {
        mockIsValidInvitationCode.mockResolvedValue(false);
        const res = await GET(req("?code=ZZZZZZ"));
        expect(res.status).toBe(401);
        expect(mockListAllFaces).not.toHaveBeenCalled();
    });

    it("admin session passes without a code", async () => {
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        mockListAllFaces.mockResolvedValue([]);
        const res = await GET(req());
        expect(res.status).toBe(200);
        expect(mockIsValidInvitationCode).not.toHaveBeenCalled();
    });

    it("returns assigned people with their best face and photo counts, sorted by name", async () => {
        mockListAllFaces.mockResolvedValue([
            face({ face_id: "f1", invitee_id: -3, confidence: 80 }),
            face({ face_id: "f2", invitee_id: 7, confidence: 85, photo_id: "p1" }),
            face({ face_id: "f3", invitee_id: 7, confidence: 99, photo_id: "p2" }),
            face({ face_id: "f4", invitee_id: 7, confidence: 60, photo_id: "p2" }),
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            { id: "p1", thumbnail_key: "t/p1.jpg", width: 1200, height: 800 },
            { id: "p2", thumbnail_key: "t/p2.jpg", width: 900, height: 600 },
        ]);

        const body = await (await GET(req("?code=ABC123"))).json();

        expect(body.people.map((p: { name: string }) => p.name)).toEqual([
            "Aoife Byrne",
            "Maggie",
        ]);
        const aoife = body.people[0];
        expect(aoife.face.face_id).toBe("f3"); // highest confidence wins
        expect(aoife.face.thumbnail_url).toBe("https://cdn/t/p2.jpg");
        expect(aoife.photo_count).toBe(2); // p1 + p2, f4 deduped into p2
    });

    it("excludes unassigned and ignored faces", async () => {
        mockListAllFaces.mockResolvedValue([
            face({ face_id: "f1" }), // no invitee
            face({ face_id: "f2", invitee_id: 7, ignored: true }),
        ]);
        const body = await (await GET(req("?code=ABC123"))).json();
        expect(body.people).toEqual([]);
    });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();
const mockIsMasterCode = vi.fn();
const mockGetInvitationIdByCode = vi.fn();
const mockGetInviteesWithIds = vi.fn();
const mockGetFacesByInvitees = vi.fn();
const mockGetPhotosByIds = vi.fn();
const mockListCategories = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/archive", () => ({
    isMasterCode: (...args: unknown[]) => mockIsMasterCode(...args),
    getInvitationIdByCode: (...args: unknown[]) => mockGetInvitationIdByCode(...args),
    getInviteesWithIds: (...args: unknown[]) => mockGetInviteesWithIds(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    getFacesByInvitees: (...args: unknown[]) => mockGetFacesByInvitees(...args),
}));
vi.mock("@/utils/db/photos", () => ({
    getPhotosByIds: (...args: unknown[]) => mockGetPhotosByIds(...args),
}));
vi.mock("@/utils/db/categories", () => ({
    listCategories: (...args: unknown[]) => mockListCategories(...args),
}));
vi.mock("@/utils/storage", () => ({
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

const photo = (over: Record<string, unknown>) => ({
    id: "p1",
    invitation_code: "ABC123",
    s3_key: "uploads/original/x/p1.jpg",
    thumbnail_key: "uploads/thumbnail/x/p1.jpg",
    file_name: "p1.jpg",
    width: 1200,
    height: 800,
    size_bytes: 1000,
    taken_at: "2026-05-30T14:00:00",
    category_id: null,
    status: "approved",
    uploaded_at: "2026-06-01T12:00:00Z",
    approved_at: null,
    approved_by: "admin@test.com",
    ...over,
});

const req = (qs = "") => new NextRequest(`http://localhost/api/gallery/my-photos${qs}`);

describe("GET /api/gallery/my-photos", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        mockIsMasterCode.mockReturnValue(false);
        mockGetInvitationIdByCode.mockResolvedValue(3);
        mockGetInviteesWithIds.mockResolvedValue([
            { id: 7, first_name: "Aoife" },
            { id: 8, first_name: "Brian" },
        ]);
        mockListCategories.mockResolvedValue([]);
    });

    it("rejects requests without a code", async () => {
        const res = await GET(req());
        expect(res.status).toBe(401);
        expect(mockGetFacesByInvitees).not.toHaveBeenCalled();
    });

    it("rejects an invalid code with a single archive read", async () => {
        mockGetInvitationIdByCode.mockResolvedValue(null);
        const res = await GET(req("?code=ZZZZZZ"));
        expect(res.status).toBe(401);
        expect(mockGetInvitationIdByCode).toHaveBeenCalledTimes(1);
    });

    it("dedupes photos when several household members appear in the same photo", async () => {
        mockGetFacesByInvitees.mockResolvedValue([
            { face_id: "f1", photo_id: "p1", invitee_id: 7 },
            { face_id: "f2", photo_id: "p1", invitee_id: 8 },
            { face_id: "f3", photo_id: "p2", invitee_id: 7 },
        ]);
        mockGetPhotosByIds.mockResolvedValue([photo({ id: "p1" }), photo({ id: "p2" })]);

        const res = await GET(req("?code=ABC123"));
        const body = await res.json();

        expect(mockGetPhotosByIds).toHaveBeenCalledWith(["p1", "p2"]);
        expect(body.photos).toHaveLength(2);
        expect(body.invitees).toEqual(["Aoife", "Brian"]);
        expect(body.total).toBe(2);
    });

    it("filters out pending and rejected photos", async () => {
        mockGetFacesByInvitees.mockResolvedValue([
            { face_id: "f1", photo_id: "p1", invitee_id: 7 },
            { face_id: "f2", photo_id: "p2", invitee_id: 7 },
            { face_id: "f3", photo_id: "p3", invitee_id: 7 },
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            photo({ id: "p1" }),
            photo({ id: "p2", status: "pending" }),
            photo({ id: "p3", status: "rejected" }),
        ]);

        const body = await (await GET(req("?code=ABC123"))).json();
        expect(body.photos.map((p: { id: string }) => p.id)).toEqual(["p1"]);
        expect(body.total).toBe(1);
    });

    it("only exposes PublicPhoto fields", async () => {
        mockGetFacesByInvitees.mockResolvedValue([
            { face_id: "f1", photo_id: "p1", invitee_id: 7 },
        ]);
        mockGetPhotosByIds.mockResolvedValue([photo({})]);

        const body = await (await GET(req("?code=ABC123"))).json();
        const keys = Object.keys(body.photos[0]);
        expect(keys).not.toContain("s3_key");
        expect(keys).not.toContain("invitation_code");
        expect(keys).not.toContain("approved_by");
        expect(body.photos[0].thumbnail_url).toBe("https://cdn/uploads/thumbnail/x/p1.jpg");
    });

    it("returns an empty result for the master code without touching the archive", async () => {
        mockIsMasterCode.mockReturnValue(true);
        const body = await (await GET(req("?code=RM2026"))).json();
        expect(body).toEqual({ photos: [], invitees: [], page: 1, limit: 200, total: 0 });
        expect(mockGetInvitationIdByCode).not.toHaveBeenCalled();
        expect(mockGetFacesByInvitees).not.toHaveBeenCalled();
    });

    it("admin without a code gets an empty 200, not a 401", async () => {
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        const res = await GET(req());
        expect(res.status).toBe(200);
        expect((await res.json()).photos).toEqual([]);
    });

    it("sorts newest first by taken_at falling back to uploaded_at", async () => {
        mockGetFacesByInvitees.mockResolvedValue([
            { face_id: "f1", photo_id: "p1", invitee_id: 7 },
            { face_id: "f2", photo_id: "p2", invitee_id: 7 },
        ]);
        mockGetPhotosByIds.mockResolvedValue([
            photo({ id: "p1", taken_at: "2026-05-30T10:00:00" }),
            photo({ id: "p2", taken_at: null, uploaded_at: "2026-05-30T20:00:00" }),
        ]);

        const body = await (await GET(req("?code=ABC123"))).json();
        expect(body.photos.map((p: { id: string }) => p.id)).toEqual(["p2", "p1"]);
    });
});

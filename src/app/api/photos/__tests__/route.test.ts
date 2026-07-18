import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockListPhotosByStatus = vi.fn();
const mockListCategories = vi.fn();
const mockRequireAuth = vi.fn();
const mockIsValidInvitationCode = vi.fn();

vi.mock("@/utils/db/photos", () => ({
    listPhotosByStatus: (...args: unknown[]) => mockListPhotosByStatus(...args),
}));

const mockListUploaderNames = vi.fn();
vi.mock("@/utils/db/archive", () => ({
    isValidInvitationCode: (...args: unknown[]) => mockIsValidInvitationCode(...args),
    listUploaderNames: (...args: unknown[]) => mockListUploaderNames(...args),
}));

const mockGetFacesByInvitees = vi.fn();
vi.mock("@/utils/db/faces", () => ({
    getFacesByInvitees: (...args: unknown[]) => mockGetFacesByInvitees(...args),
}));

vi.mock("@/utils/db/categories", () => ({
    listCategories: (...args: unknown[]) => mockListCategories(...args),
}));

vi.mock("@/utils/storage", () => ({
    getS3: () => ({}),
    BUCKET: "test-bucket",
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockPhoto = {
    id: "photo-1",
    invitation_code: "ABC123",
    s3_key: "uploads/original/ABC123/uuid.jpg",
    thumbnail_key: "uploads/thumbnail/ABC123/uuid.jpg",
    file_name: "photo.jpg",
    width: 1200,
    height: 800,
    size_bytes: 500000,
    taken_at: null,
    category_id: null,
    status: "approved",
    uploaded_at: "2026-06-01T12:00:00Z",
    approved_at: "2026-06-02T10:00:00Z",
    approved_by: "admin@test.com",
};

const ceremonyCategory = {
    id: "cat-ceremony",
    name: "The Ceremony",
    slug: "ceremony",
    description: null,
    event_day: "saturday",
    cover_photo_id: null,
    sort_order: 1,
    created_at: "2026-05-01T00:00:00Z",
};

describe("GET /api/photos", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListCategories.mockResolvedValue([ceremonyCategory]);
        // Default to an unauthenticated (public) caller with a valid code —
        // the gallery is code-access only.
        mockIsValidInvitationCode.mockResolvedValue(true);
        mockListUploaderNames.mockResolvedValue(new Map([["ABC123", "Aoife & Brian"]]));
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        });
    });

    it("rejects public requests without an invitation code", async () => {
        const req = new NextRequest("http://localhost/api/photos");
        const res = await GET(req);
        expect(res.status).toBe(401);
        expect(mockListPhotosByStatus).not.toHaveBeenCalled();
    });

    it("rejects public requests with an invalid invitation code", async () => {
        mockIsValidInvitationCode.mockResolvedValue(false);
        const req = new NextRequest("http://localhost/api/photos?code=ZZZZZZ");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("admins need no code", async () => {
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        const req = new NextRequest("http://localhost/api/photos");
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(mockIsValidInvitationCode).not.toHaveBeenCalled();
    });

    it("returns approved photos by default", async () => {
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.photos).toHaveLength(1);
        expect(data.photos[0].thumbnail_url).toBe("https://cdn/uploads/thumbnail/ABC123/uuid.jpg");
        // Verify only approved was queried
        expect(mockListPhotosByStatus).toHaveBeenCalledWith("approved");
    });

    it("person param restricts to that person's photos and composes with category", async () => {
        mockListPhotosByStatus.mockResolvedValue([
            { ...mockPhoto, id: "photo-1", category_id: "cat-ceremony" },
            { ...mockPhoto, id: "photo-2", category_id: "cat-ceremony" },
            { ...mockPhoto, id: "photo-3", category_id: null },
        ]);
        mockGetFacesByInvitees.mockResolvedValue([
            { face_id: "f1", photo_id: "photo-2", invitee_id: 7 },
            { face_id: "f2", photo_id: "photo-3", invitee_id: 7 },
        ]);

        const req = new NextRequest(
            "http://localhost/api/photos?code=ABC123&person=7&category=ceremony"
        );
        const data = await (await GET(req)).json();

        expect(mockGetFacesByInvitees).toHaveBeenCalledWith([7]);
        // photo-2 is both ceremony AND person 7; photo-3 is person 7 but not
        // ceremony; photo-1 is ceremony but not person 7.
        expect(data.photos.map((p: { id: string }) => p.id)).toEqual(["photo-2"]);
        expect(data.total).toBe(1);
    });

    it("rejects non-numeric person params, including coercible ones", async () => {
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        for (const bad of ["abc", "", " 7", "0x7", "7.5"]) {
            const req = new NextRequest(
                `http://localhost/api/photos?code=ABC123&person=${encodeURIComponent(bad)}`
            );
            const res = await GET(req);
            expect(res.status, `person=${JSON.stringify(bad)}`).toBe(400);
        }
        expect(mockGetFacesByInvitees).not.toHaveBeenCalled();
    });

    it("does not query faces without a person param", async () => {
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        await GET(req);
        expect(mockGetFacesByInvitees).not.toHaveBeenCalled();
    });

    it("attributes guest uploads to their household by name", async () => {
        mockListPhotosByStatus.mockResolvedValue([
            { ...mockPhoto, id: "guest-upload", invitation_code: "ABC123" },
            { ...mockPhoto, id: "professional", invitation_code: undefined },
        ]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        const data = await (await GET(req)).json();

        const byId = Object.fromEntries(
            data.photos.map((p: { id: string; uploaded_by: string | null }) => [
                p.id,
                p.uploaded_by,
            ])
        );
        expect(byId["guest-upload"]).toBe("Aoife & Brian");
        expect(byId["professional"]).toBeNull();
    });

    it("skips the archive scan when the page has no guest uploads", async () => {
        mockListPhotosByStatus.mockResolvedValue([
            { ...mockPhoto, invitation_code: undefined },
        ]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        await GET(req);
        expect(mockListUploaderNames).not.toHaveBeenCalled();
    });

    it("does not expose sensitive fields to public callers", async () => {
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        const res = await GET(req);
        const data = await res.json();
        const photo = data.photos[0];
        expect(photo).not.toHaveProperty("invitation_code");
        expect(photo).not.toHaveProperty("s3_key");
        expect(photo).not.toHaveProperty("thumbnail_key");
        expect(photo).not.toHaveProperty("approved_by");
        expect(photo).not.toHaveProperty("approved_at");
        expect(photo).not.toHaveProperty("size_bytes");
        // Fields the gallery needs are still present
        expect(photo.id).toBe("photo-1");
        expect(photo.file_name).toBe("photo.jpg");
        expect(photo.width).toBe(1200);
        expect(photo.height).toBe(800);
        expect(photo.thumbnail_url).toBe("https://cdn/uploads/thumbnail/ABC123/uuid.jpg");
    });

    it("returns full rows to authenticated admins", async () => {
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
        mockListPhotosByStatus.mockResolvedValue([mockPhoto]);
        const req = new NextRequest("http://localhost/api/photos?status=approved");
        const res = await GET(req);
        const data = await res.json();
        const photo = data.photos[0];
        expect(photo.invitation_code).toBe("ABC123");
        expect(photo.s3_key).toBe("uploads/original/ABC123/uuid.jpg");
        expect(photo.approved_by).toBe("admin@test.com");
    });

    it("filters by category slug", async () => {
        mockListPhotosByStatus.mockResolvedValue([
            { ...mockPhoto, id: "photo-1", category_id: "cat-ceremony" },
            { ...mockPhoto, id: "photo-2", category_id: null },
        ]);
        const req = new NextRequest("http://localhost/api/photos?category=ceremony&code=ABC123");
        const res = await GET(req);
        const data = await res.json();
        expect(data.photos).toHaveLength(1);
        expect(data.photos[0].id).toBe("photo-1");
        expect(data.photos[0].category_slug).toBe("ceremony");
        expect(data.total).toBe(1);
    });

    it("respects page and limit params", async () => {
        const photos = Array.from({ length: 25 }, (_, i) => ({ ...mockPhoto, id: `photo-${i}` }));
        mockListPhotosByStatus.mockResolvedValue(photos);
        const req = new NextRequest("http://localhost/api/photos?page=2&limit=10&code=ABC123");
        const res = await GET(req);
        const data = await res.json();
        expect(data.page).toBe(2);
        expect(data.limit).toBe(10);
        expect(data.total).toBe(25);
        expect(data.photos).toHaveLength(10);
        expect(data.photos[0].id).toBe("photo-10"); // offset = (2-1)*10
    });

    it("requires auth for pending status", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        });
        const req = new NextRequest("http://localhost/api/photos?status=pending");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("returns null thumbnail_url when thumbnail_key is null", async () => {
        mockListPhotosByStatus.mockResolvedValue([{ ...mockPhoto, thumbnail_key: null }]);
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        const res = await GET(req);
        const data = await res.json();
        expect(data.photos[0].thumbnail_url).toBeNull();
    });

    it("handles database errors", async () => {
        mockListPhotosByStatus.mockRejectedValue(new Error("DB error"));
        const req = new NextRequest("http://localhost/api/photos?code=ABC123");
        const res = await GET(req);
        expect(res.status).toBe(500);
    });
});

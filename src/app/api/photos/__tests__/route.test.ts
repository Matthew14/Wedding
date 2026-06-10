import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockQuery = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/utils/db/client", () => ({
    getDb: () => ({ query: mockQuery }),
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
    category_slug: null,
    status: "approved",
    uploaded_at: "2026-06-01T12:00:00Z",
    approved_at: "2026-06-02T10:00:00Z",
    approved_by: "admin@test.com",
};

describe("GET /api/photos", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns approved photos by default", async () => {
        mockQuery.mockResolvedValue({ rows: [mockPhoto] });
        const req = new NextRequest("http://localhost/api/photos");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.photos).toHaveLength(1);
        expect(data.photos[0].thumbnail_url).toBe("https://cdn/uploads/thumbnail/ABC123/uuid.jpg");
        // Verify only approved was queried
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain("status");
        expect(params[0]).toBe("approved");
    });

    it("filters by category slug", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost/api/photos?category=ceremony");
        await GET(req);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain("pc.slug");
        expect(params).toContain("ceremony");
    });

    it("respects page and limit params", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost/api/photos?page=2&limit=10");
        const res = await GET(req);
        const data = await res.json();
        expect(data.page).toBe(2);
        expect(data.limit).toBe(10);
        const [, params] = mockQuery.mock.calls[0];
        expect(params).toContain(10); // limit
        expect(params).toContain(10); // offset = (2-1)*10
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
        mockQuery.mockResolvedValue({ rows: [{ ...mockPhoto, thumbnail_key: null }] });
        const req = new NextRequest("http://localhost/api/photos");
        const res = await GET(req);
        const data = await res.json();
        expect(data.photos[0].thumbnail_url).toBeNull();
    });

    it("handles database errors", async () => {
        mockQuery.mockRejectedValue(new Error("DB error"));
        const req = new NextRequest("http://localhost/api/photos");
        const res = await GET(req);
        expect(res.status).toBe(500);
    });
});

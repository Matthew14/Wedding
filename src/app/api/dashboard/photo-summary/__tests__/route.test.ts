import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockListPhotosByStatus = vi.fn();
const mockCountPhotosByStatus = vi.fn();
const mockListCategories = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/utils/db/photos", () => ({
    listPhotosByStatus: (...args: unknown[]) => mockListPhotosByStatus(...args),
    countPhotosByStatus: (...args: unknown[]) => mockCountPhotosByStatus(...args),
}));

vi.mock("@/utils/db/categories", () => ({
    listCategories: (...args: unknown[]) => mockListCategories(...args),
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock("@/utils/logger", () => ({
    error: vi.fn(),
}));

const categories = [
    { id: "cat-1", name: "The Ceremony", slug: "ceremony", sort_order: 1 },
    { id: "cat-2", name: "Party", slug: "party", sort_order: 2 },
];

function approvedPhoto(id: string, categoryId: string | null) {
    return { id, category_id: categoryId, status: "approved" };
}

describe("GET /api/dashboard/photo-summary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
        mockListCategories.mockResolvedValue(categories);
    });

    it("requires authentication", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        });
        const res = await GET(new NextRequest("http://localhost/api/dashboard/photo-summary"));
        expect(res.status).toBe(401);
    });

    it("aggregates status counts, recent uploads, and per-category counts", async () => {
        mockListPhotosByStatus.mockResolvedValue([
            approvedPhoto("p1", "cat-1"),
            approvedPhoto("p2", "cat-1"),
            approvedPhoto("p3", null),
        ]);
        // pending, rejected, then recent approved/pending/rejected
        mockCountPhotosByStatus
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(0);

        const res = await GET(new NextRequest("http://localhost/api/dashboard/photo-summary"));
        expect(res.status).toBe(200);
        const { summary } = await res.json();

        expect(summary.approved).toBe(3);
        expect(summary.pending).toBe(4);
        expect(summary.rejected).toBe(1);
        expect(summary.total).toBe(8);
        expect(summary.recentUploads).toBe(5);
        expect(summary.byCategory).toEqual([
            { id: "cat-1", name: "The Ceremony", count: 2 },
            { id: "cat-2", name: "Party", count: 0 },
            { id: null, name: "Uncategorised", count: 1 },
        ]);
    });

    it("omits the Uncategorised row when every photo has a category", async () => {
        mockListPhotosByStatus.mockResolvedValue([approvedPhoto("p1", "cat-2")]);
        mockCountPhotosByStatus.mockResolvedValue(0);

        const res = await GET(new NextRequest("http://localhost/api/dashboard/photo-summary"));
        const { summary } = await res.json();
        expect(summary.byCategory).toEqual([
            { id: "cat-1", name: "The Ceremony", count: 0 },
            { id: "cat-2", name: "Party", count: 1 },
        ]);
    });

    it("handles database errors", async () => {
        mockListPhotosByStatus.mockRejectedValue(new Error("DB error"));
        mockCountPhotosByStatus.mockResolvedValue(0);
        const res = await GET(new NextRequest("http://localhost/api/dashboard/photo-summary"));
        expect(res.status).toBe(500);
    });
});

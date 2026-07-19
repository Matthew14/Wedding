import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";

const mockListCategories = vi.fn();
const mockGetPhotoById = vi.fn();
const mockListPhotosByStatus = vi.fn();

vi.mock("@/utils/db/categories", () => ({
    listCategories: (...args: unknown[]) => mockListCategories(...args),
    createCategory: vi.fn(),
}));

vi.mock("@/utils/db/photos", () => ({
    getPhotoById: (...args: unknown[]) => mockGetPhotoById(...args),
    listPhotosByStatus: (...args: unknown[]) => mockListPhotosByStatus(...args),
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("@/utils/storage", () => ({
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

const category = (id: string, cover_photo_id: string | null = null) => ({
    id,
    name: id,
    slug: id,
    description: null,
    event_day: null,
    cover_photo_id,
    sort_order: 1,
});

describe("GET /api/gallery/categories", () => {
    beforeEach(() => vi.clearAllMocks());

    it("uses the curated cover photo when set", async () => {
        mockListCategories.mockResolvedValue([category("cat-1", "photo-9")]);
        mockGetPhotoById.mockResolvedValue({ id: "photo-9", thumbnail_key: "thumb/9.jpg" });

        const data = await (await GET()).json();

        expect(data.categories[0].cover_thumbnail_url).toBe("https://cdn/thumb/9.jpg");
        // Every category has a curated cover — no fallback query needed.
        expect(mockListPhotosByStatus).not.toHaveBeenCalled();
    });

    it("falls back to the newest approved photo when no cover is curated", async () => {
        mockListCategories.mockResolvedValue([category("cat-1"), category("cat-2")]);
        // uploaded_at DESC, as listPhotosByStatus returns them.
        mockListPhotosByStatus.mockResolvedValue([
            { id: "p3", category_id: "cat-1", thumbnail_key: "thumb/newest.jpg" },
            { id: "p2", category_id: "cat-1", thumbnail_key: "thumb/older.jpg" },
            { id: "p1", category_id: "cat-2", thumbnail_key: null }, // unprocessed
        ]);

        const data = await (await GET()).json();

        const byId = Object.fromEntries(
            data.categories.map((c: { id: string; cover_thumbnail_url: string | null }) => [
                c.id,
                c.cover_thumbnail_url,
            ])
        );
        expect(byId["cat-1"]).toBe("https://cdn/thumb/newest.jpg");
        // No approved processed photo in the category → still no cover.
        expect(byId["cat-2"]).toBeNull();
        expect(mockListPhotosByStatus).toHaveBeenCalledWith("approved");
    });
});

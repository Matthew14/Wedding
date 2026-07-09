import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

const mockUpdateCategory = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/utils/db/categories", () => ({
    updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const updatedCategory = {
    id: "cat-1",
    name: "The Ceremony",
    slug: "ceremony",
    description: null,
    event_day: "saturday",
    cover_photo_id: null,
    sort_order: 1,
    created_at: "2026-05-01T00:00:00Z",
};

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/gallery/categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const params = { params: Promise.resolve({ id: "cat-1" }) };

describe("PATCH /api/gallery/categories/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });
    });

    it("requires authentication", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        });
        const res = await PATCH(makeRequest({ name: "New Name" }), params);
        expect(res.status).toBe(401);
        expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it("renames a category", async () => {
        mockUpdateCategory.mockResolvedValue({ ...updatedCategory, name: "New Name" });
        const res = await PATCH(makeRequest({ name: "  New Name  " }), params);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.category.name).toBe("New Name");
        expect(mockUpdateCategory).toHaveBeenCalledWith("cat-1", { name: "New Name" });
    });

    it("updates description and sort_order", async () => {
        mockUpdateCategory.mockResolvedValue(updatedCategory);
        const res = await PATCH(makeRequest({ description: "During the vows", sort_order: 3 }), params);
        expect(res.status).toBe(200);
        expect(mockUpdateCategory).toHaveBeenCalledWith("cat-1", {
            description: "During the vows",
            sort_order: 3,
        });
    });

    it("normalises an empty description to null", async () => {
        mockUpdateCategory.mockResolvedValue(updatedCategory);
        const res = await PATCH(makeRequest({ description: "   " }), params);
        expect(res.status).toBe(200);
        expect(mockUpdateCategory).toHaveBeenCalledWith("cat-1", { description: null });
    });

    it("rejects slug changes", async () => {
        const res = await PATCH(makeRequest({ slug: "new-slug" }), params);
        expect(res.status).toBe(400);
        expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it("rejects an empty name", async () => {
        const res = await PATCH(makeRequest({ name: "   " }), params);
        expect(res.status).toBe(400);
        expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it("rejects a non-numeric sort_order", async () => {
        const res = await PATCH(makeRequest({ sort_order: "first" }), params);
        expect(res.status).toBe(400);
        expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it("rejects a body with no updatable fields", async () => {
        const res = await PATCH(makeRequest({ event_day: "friday" }), params);
        expect(res.status).toBe(400);
        expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it("returns 404 when the category does not exist", async () => {
        mockUpdateCategory.mockResolvedValue(null);
        const res = await PATCH(makeRequest({ name: "New Name" }), params);
        expect(res.status).toBe(404);
    });

    it("handles database errors", async () => {
        mockUpdateCategory.mockRejectedValue(new Error("DB error"));
        const res = await PATCH(makeRequest({ name: "New Name" }), params);
        expect(res.status).toBe(500);
    });
});

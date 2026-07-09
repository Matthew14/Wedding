import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

const mockUpdatePhotoModeration = vi.fn();

vi.mock("@/utils/db/photos", () => ({
    updatePhotoModeration: (...args: unknown[]) => mockUpdatePhotoModeration(...args),
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: vi.fn(),
}));

import { requireAuth } from "@/utils/auth/requireAuth";
const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

const authenticated = () =>
    mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });

const unauthenticated = () =>
    mockRequireAuth.mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/photos/photo-1", {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

const params = Promise.resolve({ id: "photo-1" });

describe("PATCH /api/photos/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 without auth", async () => {
        unauthenticated();
        const res = await PATCH(makeRequest({ status: "approved" }), { params });
        expect(res.status).toBe(401);
    });

    it("returns 400 for invalid status", async () => {
        authenticated();
        const res = await PATCH(makeRequest({ status: "invalid" }), { params });
        expect(res.status).toBe(400);
    });

    it("approves photo successfully", async () => {
        authenticated();
        mockUpdatePhotoModeration.mockResolvedValue(true);
        const res = await PATCH(makeRequest({ status: "approved" }), { params });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("approved");
        expect(data.id).toBe("photo-1");
        // Verify approved_by is set
        expect(mockUpdatePhotoModeration).toHaveBeenCalledWith(
            "photo-1",
            expect.objectContaining({ status: "approved", approvedBy: "admin@test.com" })
        );
    });

    it("rejects photo successfully", async () => {
        authenticated();
        mockUpdatePhotoModeration.mockResolvedValue(true);
        const res = await PATCH(makeRequest({ status: "rejected" }), { params });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("rejected");
    });

    it("returns 404 for non-existent photo", async () => {
        authenticated();
        mockUpdatePhotoModeration.mockResolvedValue(false);
        const res = await PATCH(makeRequest({ status: "approved" }), { params });
        expect(res.status).toBe(404);
    });

    it("sets category when provided", async () => {
        authenticated();
        mockUpdatePhotoModeration.mockResolvedValue(true);
        await PATCH(makeRequest({ status: "approved", categoryId: "cat-uuid" }), { params });
        expect(mockUpdatePhotoModeration).toHaveBeenCalledWith(
            "photo-1",
            expect.objectContaining({ categoryId: "cat-uuid" })
        );
    });

    it("handles database errors", async () => {
        authenticated();
        mockUpdatePhotoModeration.mockRejectedValue(new Error("DB error"));
        const res = await PATCH(makeRequest({ status: "approved" }), { params });
        expect(res.status).toBe(500);
    });
});

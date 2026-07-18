import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "../route";

const mockUpdatePhotoModeration = vi.fn();
const mockGetPhotoById = vi.fn();
const mockDeletePhotoRow = vi.fn();
const mockDeleteFacesByPhoto = vi.fn();
const mockS3Send = vi.fn();

vi.mock("@/utils/db/photos", () => ({
    updatePhotoModeration: (...args: unknown[]) => mockUpdatePhotoModeration(...args),
    getPhotoById: (...args: unknown[]) => mockGetPhotoById(...args),
    deletePhotoRow: (...args: unknown[]) => mockDeletePhotoRow(...args),
}));

vi.mock("@/utils/db/faces", () => ({
    deleteFacesByPhoto: (...args: unknown[]) => mockDeleteFacesByPhoto(...args),
}));

vi.mock("@/utils/storage", () => ({
    getS3: () => ({ send: (...args: unknown[]) => mockS3Send(...args) }),
    BUCKET: "test-bucket",
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

describe("DELETE /api/photos/[id]", () => {
    const rejectedPhoto = {
        id: "photo-1",
        s3_key: "uploads/original/ABC123/uuid.heic",
        thumbnail_key: "uploads/thumbnail/ABC123/uuid.jpg",
        status: "rejected",
    };
    const deleteRequest = () =>
        new NextRequest("http://localhost/api/photos/photo-1", { method: "DELETE" });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPhotoById.mockResolvedValue(rejectedPhoto);
        mockS3Send.mockResolvedValue({});
        mockDeleteFacesByPhoto.mockResolvedValue(2);
        mockDeletePhotoRow.mockResolvedValue(undefined);
    });

    it("returns 401 without auth", async () => {
        unauthenticated();
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(401);
        expect(mockDeletePhotoRow).not.toHaveBeenCalled();
    });

    it("deletes S3 objects, face rows, and the photo row", async () => {
        authenticated();
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ id: "photo-1", deleted: true });

        const s3Keys = mockS3Send.mock.calls.map(
            (c) => (c[0] as { input: { Key: string } }).input.Key
        );
        expect(s3Keys).toEqual([
            "uploads/original/ABC123/uuid.heic",
            "uploads/thumbnail/ABC123/uuid.jpg",
        ]);
        expect(mockDeleteFacesByPhoto).toHaveBeenCalledWith("photo-1");
        expect(mockDeletePhotoRow).toHaveBeenCalledWith("photo-1");
    });

    it("skips the thumbnail delete when none exists (stuck photos)", async () => {
        authenticated();
        mockGetPhotoById.mockResolvedValue({ ...rejectedPhoto, thumbnail_key: null });
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(200);
        expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it("refuses to delete photos that are not rejected", async () => {
        authenticated();
        mockGetPhotoById.mockResolvedValue({ ...rejectedPhoto, status: "approved" });
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(400);
        expect(mockS3Send).not.toHaveBeenCalled();
        expect(mockDeletePhotoRow).not.toHaveBeenCalled();
    });

    it("returns 404 for a non-existent photo", async () => {
        authenticated();
        mockGetPhotoById.mockResolvedValue(null);
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(404);
    });

    it("keeps the photo row when S3 deletion fails (retryable)", async () => {
        authenticated();
        mockS3Send.mockRejectedValue(new Error("S3 error"));
        const res = await DELETE(deleteRequest(), { params });
        expect(res.status).toBe(500);
        expect(mockDeletePhotoRow).not.toHaveBeenCalled();
    });
});

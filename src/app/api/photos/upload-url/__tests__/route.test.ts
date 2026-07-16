import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockIsValidInvitationCode = vi.fn();
const mockIsMasterCode = vi.fn();
const mockCountUploadsSince = vi.fn();
const mockCreatePhoto = vi.fn();
const mockGetCategoryBySlug = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@/utils/db/archive", () => ({
    isValidInvitationCode: (...args: unknown[]) => mockIsValidInvitationCode(...args),
    isMasterCode: (...args: unknown[]) => mockIsMasterCode(...args),
}));

vi.mock("@/utils/db/photos", () => ({
    createPhoto: (...args: unknown[]) => mockCreatePhoto(...args),
    countUploadsSince: (...args: unknown[]) => mockCountUploadsSince(...args),
}));

vi.mock("@/utils/db/categories", () => ({
    getCategoryBySlug: (...args: unknown[]) => mockGetCategoryBySlug(...args),
}));

vi.mock("@/utils/storage", () => ({
    getS3: () => ({}),
    BUCKET: "test-bucket",
    cdnUrl: (k: string) => `https://cdn/${k}`,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock("@aws-sdk/client-s3", () => ({
    PutObjectCommand: class PutObjectCommand {
        constructor(public input: unknown) {}
    },
}));

function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/photos/upload-url", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

describe("POST /api/photos/upload-url", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSignedUrl.mockResolvedValue("https://s3-presigned-url");
        mockIsValidInvitationCode.mockResolvedValue(true);
        mockCountUploadsSince.mockResolvedValue(0);
        mockGetCategoryBySlug.mockResolvedValue({ id: "cat-guest", slug: "guest-photos" });
        mockCreatePhoto.mockImplementation(async (input: { s3_key: string }) => ({
            id: "photo-uuid-1",
            ...input,
            status: "pending",
        }));
    });

    it("returns 400 for missing fields", async () => {
        const res = await POST(makeRequest({ code: "ABC123" }));
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/required/);
    });

    it("returns 400 for invalid content type", async () => {
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "test.gif", contentType: "image/gif", sizeBytes: 100 })
        );
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/contentType/);
    });

    it("returns 400 for file exceeding 20MB", async () => {
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "big.jpg", contentType: "image/jpeg", sizeBytes: 21 * 1024 * 1024 })
        );
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/20 MB/);
    });

    it("returns 400 for invalid invitation code", async () => {
        mockIsValidInvitationCode.mockResolvedValue(false);
        const res = await POST(
            makeRequest({ code: "XXXXXX", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid invitation code/);
    });

    it("returns 429 when rate limit exceeded", async () => {
        mockCountUploadsSince.mockResolvedValue(50);
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(429);
    });

    it("exempts the master code from the rate limit", async () => {
        mockIsMasterCode.mockReturnValue(true);
        const res = await POST(
            makeRequest({ code: "RM2026", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(200);
        expect(mockCountUploadsSince).not.toHaveBeenCalled();
    });

    it("returns upload URL for valid request", async () => {
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.uploadUrl).toBe("https://s3-presigned-url");
        expect(data.photoId).toBe("photo-uuid-1");
        expect(data.key).toMatch(/^uploads\/original\/ABC123\//);
        // The photo lands in the guest-photos category
        expect(mockCreatePhoto).toHaveBeenCalledWith(
            expect.objectContaining({ invitation_code: "ABC123", category_id: "cat-guest" })
        );
    });

    it("creates the photo uncategorised when the guest category is missing", async () => {
        mockGetCategoryBySlug.mockResolvedValue(null);
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(200);
        expect(mockCreatePhoto).toHaveBeenCalledWith(
            expect.objectContaining({ category_id: null })
        );
    });

    it("accepts image/heif uploads", async () => {
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.heif", contentType: "image/heif", sizeBytes: 500 })
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.key).toMatch(/\.heif$/);
    });

    it("handles database errors gracefully", async () => {
        mockIsValidInvitationCode.mockRejectedValue(new Error("DB connection failed"));
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe("Internal server error");
    });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockQuery = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@/utils/db/client", () => ({
    getDb: () => ({ query: mockQuery }),
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
        mockQuery.mockResolvedValueOnce({ rows: [] }); // code lookup returns nothing
        const res = await POST(
            makeRequest({ code: "XXXXXX", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid invitation code/);
    });

    it("returns 429 when rate limit exceeded", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ code: "ABC123" }] }) // code valid
            .mockResolvedValueOnce({ rows: [{ count: 50 }] });      // rate limit hit
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(429);
    });

    it("returns upload URL for valid request", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ code: "ABC123" }] })  // code valid
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })         // under rate limit
            .mockResolvedValueOnce({ rows: [{ id: "photo-uuid-1" }] }); // insert

        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.uploadUrl).toBe("https://s3-presigned-url");
        expect(data.photoId).toBe("photo-uuid-1");
        expect(data.key).toMatch(/^uploads\/original\/ABC123\//);
    });

    it("handles database errors gracefully", async () => {
        mockQuery.mockRejectedValue(new Error("DB connection failed"));
        const res = await POST(
            makeRequest({ code: "ABC123", fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 500 })
        );
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe("Internal server error");
    });
});

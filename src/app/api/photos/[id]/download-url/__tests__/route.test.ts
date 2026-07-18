import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockIsValidInvitationCode = vi.fn();
const mockGetPhotoById = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@/utils/db/archive", () => ({
    isValidInvitationCode: (...args: unknown[]) => mockIsValidInvitationCode(...args),
}));
vi.mock("@/utils/db/photos", () => ({
    getPhotoById: (...args: unknown[]) => mockGetPhotoById(...args),
}));
vi.mock("@/utils/storage", () => ({
    getS3: () => ({}),
    BUCKET: "test-bucket",
}));
vi.mock("@aws-sdk/client-s3", () => ({
    GetObjectCommand: class {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    },
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

import { GET } from "../route";

const params = { params: Promise.resolve({ id: "photo-1" }) };
const req = (qs = "?code=ABC123") =>
    new NextRequest(`http://localhost/api/photos/photo-1/download-url${qs}`);

const approvedPhoto = (fileName: string) => ({
    id: "photo-1",
    s3_key: "uploads/original/ABC123/uuid.jpg",
    file_name: fileName,
    status: "approved",
});

// The disposition passed to the presigner, for a given stored file name.
async function dispositionFor(fileName: string): Promise<string> {
    mockGetPhotoById.mockResolvedValue(approvedPhoto(fileName));
    const res = await GET(req(), params);
    expect(res.status).toBe(302);
    const command = mockGetSignedUrl.mock.calls[0][1] as {
        input: { ResponseContentDisposition: string };
    };
    return command.input.ResponseContentDisposition;
}

describe("GET /api/photos/[id]/download-url", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsValidInvitationCode.mockResolvedValue(true);
        mockGetSignedUrl.mockResolvedValue("https://signed.example/photo");
    });

    it("requires a code", async () => {
        const res = await GET(req(""), params);
        expect(res.status).toBe(400);
    });

    it("rejects an invalid code", async () => {
        mockIsValidInvitationCode.mockResolvedValue(false);
        const res = await GET(req(), params);
        expect(res.status).toBe(403);
    });

    it("404s for a missing photo and 403s for unapproved ones", async () => {
        mockGetPhotoById.mockResolvedValue(null);
        expect((await GET(req(), params)).status).toBe(404);
        mockGetPhotoById.mockResolvedValue({ ...approvedPhoto("a.jpg"), status: "pending" });
        expect((await GET(req(), params)).status).toBe(403);
    });

    it("redirects to a presigned URL that forces a download", async () => {
        const disposition = await dispositionFor("beach.jpg");
        expect(disposition).toBe('attachment; filename="beach.jpg"; filename*=UTF-8\'\'beach.jpg');
    });

    it("strips header-injection characters from the ASCII filename", async () => {
        const disposition = await dispositionFor('evil";\r\nX: y.jpg');
        const asciiPart = disposition.match(/filename="([^"]*)"/)?.[1] ?? "";
        expect(asciiPart).not.toMatch(/["\r\n;]/);
        expect(asciiPart).toBe("evil____X_ y.jpg");
    });

    it("preserves non-ASCII names via RFC 5987 while keeping an ASCII fallback", async () => {
        const disposition = await dispositionFor("café.jpg");
        expect(disposition).toContain('filename="caf_.jpg"');
        expect(disposition).toContain("filename*=UTF-8''caf%C3%A9.jpg");
    });
});

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getDb } from "@/utils/db/client";
import { getS3, BUCKET } from "@/utils/storage";
import type { UploadUrlRequest, UploadUrlResponse } from "@/types/photos";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic"] as const;
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const RATE_LIMIT = 50;
const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
};

export async function POST(request: NextRequest) {
    try {
        const body: UploadUrlRequest = await request.json();
        const { code, fileName, contentType, sizeBytes } = body;

        if (!code || !fileName || !contentType || sizeBytes == null) {
            return NextResponse.json({ error: "code, fileName, contentType, sizeBytes are required" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
            return NextResponse.json({ error: "contentType must be image/jpeg, image/png, or image/heic" }, { status: 400 });
        }

        if (sizeBytes > MAX_SIZE) {
            return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
        }

        const db = getDb();

        const { rows: codeRows } = await db.query<{ code: string }>(
            "SELECT code FROM invitation_codes WHERE code = $1",
            [code]
        );
        if (codeRows.length === 0) {
            return NextResponse.json({ error: "Invalid invitation code" }, { status: 400 });
        }

        const { rows: rateRows } = await db.query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM photos WHERE invitation_code = $1 AND uploaded_at > NOW() - INTERVAL '1 hour'",
            [code]
        );
        if ((rateRows[0]?.count ?? 0) >= RATE_LIMIT) {
            return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
        }

        const uuid = randomUUID();
        const ext = EXT_MAP[contentType] ?? "jpg";
        const key = `uploads/original/${code}/${uuid}.${ext}`;

        const uploadUrl = await getSignedUrl(
            getS3(),
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                ContentType: contentType,
                ContentLength: sizeBytes,
            }),
            { expiresIn: 300 }
        );

        const { rows: inserted } = await db.query<{ id: string }>(
            `INSERT INTO photos (invitation_code, s3_key, file_name, size_bytes, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING id`,
            [code, key, fileName, sizeBytes]
        );

        const response: UploadUrlResponse = {
            uploadUrl,
            photoId: inserted[0].id,
            key,
        };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in POST /api/photos/upload-url:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

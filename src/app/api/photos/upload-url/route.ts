import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { isValidInvitationCode } from "@/utils/db/archive";
import { createPhoto, countUploadsSince } from "@/utils/db/photos";
import { getCategoryBySlug } from "@/utils/db/categories";
import { getS3, BUCKET } from "@/utils/storage";
import type { UploadUrlRequest, UploadUrlResponse } from "@/types/photos";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const RATE_LIMIT = 50;
// Guest uploads are filed under their own category (and tab). Resolved at insert
// time; if the category is missing the photo is left uncategorised.
const GUEST_CATEGORY_SLUG = "guest-photos";
const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
    "image/heif": "heif",
};

export async function POST(request: NextRequest) {
    try {
        const body: UploadUrlRequest = await request.json();
        const { code, fileName, contentType, sizeBytes } = body;

        if (!code || !fileName || !contentType || sizeBytes == null) {
            return NextResponse.json({ error: "code, fileName, contentType, sizeBytes are required" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
            return NextResponse.json({ error: "contentType must be image/jpeg, image/png, image/heic, or image/heif" }, { status: 400 });
        }

        if (sizeBytes > MAX_SIZE) {
            return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
        }

        const codeValid = await isValidInvitationCode(code);
        if (!codeValid) {
            return NextResponse.json({ error: "Invalid invitation code" }, { status: 400 });
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentUploads = await countUploadsSince(code, oneHourAgo);
        if (recentUploads >= RATE_LIMIT) {
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

        const guestCategory = await getCategoryBySlug(GUEST_CATEGORY_SLUG);
        const photo = await createPhoto({
            invitation_code: code,
            s3_key: key,
            file_name: fileName,
            size_bytes: sizeBytes,
            category_id: guestCategory?.id ?? null,
        });

        const response: UploadUrlResponse = {
            uploadUrl,
            photoId: photo.id,
            key,
        };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in POST /api/photos/upload-url:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

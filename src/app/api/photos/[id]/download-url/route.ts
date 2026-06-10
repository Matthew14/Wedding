import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDb } from "@/utils/db/client";
import { getS3, BUCKET } from "@/utils/storage";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const code = request.nextUrl.searchParams.get("code");

        if (!code) {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }

        const db = getDb();

        const { rows: codeRows } = await db.query<{ code: string }>(
            "SELECT code FROM invitation_codes WHERE code = $1",
            [code]
        );
        if (codeRows.length === 0) {
            return NextResponse.json({ error: "Invalid invitation code" }, { status: 403 });
        }

        const { rows } = await db.query<{ s3_key: string; status: string }>(
            "SELECT s3_key, status FROM photos WHERE id = $1",
            [id]
        );
        if (rows.length === 0) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }
        if (rows[0].status !== "approved") {
            return NextResponse.json({ error: "Photo not available" }, { status: 403 });
        }

        const downloadUrl = await getSignedUrl(
            getS3(),
            new GetObjectCommand({ Bucket: BUCKET, Key: rows[0].s3_key }),
            { expiresIn: 900 }
        );

        return NextResponse.redirect(downloadUrl, 302);
    } catch (error) {
        console.error("Error in GET /api/photos/[id]/download-url:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

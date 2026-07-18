import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isValidInvitationCode } from "@/utils/db/archive";
import { getPhotoById } from "@/utils/db/photos";
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

        const codeValid = await isValidInvitationCode(code);
        if (!codeValid) {
            return NextResponse.json({ error: "Invalid invitation code" }, { status: 403 });
        }

        const photo = await getPhotoById(id);
        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }
        if (photo.status !== "approved") {
            return NextResponse.json({ error: "Photo not available" }, { status: 403 });
        }

        // Without an attachment disposition the browser follows the redirect
        // and just DISPLAYS the image; this makes S3 serve it as a download
        // with the original file name. The ASCII fallback also strips ", CR/LF
        // and ; — file_name is guest-supplied, so this doubles as header-
        // injection protection. filename* (RFC 5987) preserves accented or
        // non-Latin names in modern browsers.
        const safeName = photo.file_name.replace(/[^\w.\- ]/g, "_");
        const utf8Name = encodeURIComponent(photo.file_name).replace(
            /['()*]/g,
            (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
        );
        const downloadUrl = await getSignedUrl(
            getS3(),
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: photo.s3_key,
                ResponseContentDisposition: `attachment; filename="${safeName}"; filename*=UTF-8''${utf8Name}`,
            }),
            { expiresIn: 900 }
        );

        return NextResponse.redirect(downloadUrl, 302);
    } catch (error) {
        console.error("Error in GET /api/photos/[id]/download-url:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

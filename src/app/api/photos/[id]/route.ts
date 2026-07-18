import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { updatePhotoModeration, getPhotoById, deletePhotoRow } from "@/utils/db/photos";
import { deleteFacesByPhoto } from "@/utils/db/faces";
import { requireAuth } from "@/utils/auth/requireAuth";
import { getS3, BUCKET } from "@/utils/storage";

interface PatchBody {
    status: "approved" | "rejected";
    categoryId?: string;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body: PatchBody = await request.json();
        const { status, categoryId } = body;

        if (status !== "approved" && status !== "rejected") {
            return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
        }

        const approvedBy = (auth.payload.email as string | undefined) ?? null;

        const found = await updatePhotoModeration(id, {
            status,
            categoryId: categoryId ?? null,
            approvedBy,
        });

        if (!found) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        return NextResponse.json({ id, status });
    } catch (error) {
        console.error("Error in PATCH /api/photos/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Permanently delete a photo: S3 original + thumbnail, its face rows, and
// the photo row itself. Restricted to REJECTED photos — anything else must
// be rejected first, so a mis-click can't destroy an approved photo.
// Ordering is deliberate: S3 objects go first (if that fails the row
// survives and the admin can retry), and the row goes last (once it's gone
// there is nothing left to retry from).
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const photo = await getPhotoById(id);
        if (!photo) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }
        if (photo.status !== "rejected") {
            return NextResponse.json(
                { error: "Only rejected photos can be deleted" },
                { status: 400 }
            );
        }

        const s3 = getS3();
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photo.s3_key }));
        if (photo.thumbnail_key) {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photo.thumbnail_key }));
        }
        await deleteFacesByPhoto(id);
        await deletePhotoRow(id);

        return NextResponse.json({ id, deleted: true });
    } catch (error) {
        console.error("Error in DELETE /api/photos/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

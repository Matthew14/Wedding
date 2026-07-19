import { NextRequest, NextResponse } from "next/server";
import { listPhotosByStatus } from "@/utils/db/photos";
import { listCategories } from "@/utils/db/categories";
import { isValidInvitationCode, listUploaderNames } from "@/utils/db/archive";
import { getFacesByInvitees } from "@/utils/db/faces";
import { requireAuth } from "@/utils/auth/requireAuth";
import { cdnUrl } from "@/utils/storage";
import type { Photo, PublicPhoto } from "@/types/photos";

interface PhotoRow extends Photo {
    category_slug: string | null;
    thumbnail_url?: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const categorySlug = searchParams.get("category");
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
        const offset = (page - 1) * limit;

        // Admin can request any status and receives full rows; public requests
        // only see approved photos with a restricted set of fields.
        const auth = await requireAuth(request);
        const isAdmin = auth.success;

        // The gallery is code-access only: unauthenticated callers must
        // present a valid invitation code (guest or master).
        if (!isAdmin) {
            const code = searchParams.get("code")?.trim().toUpperCase();
            if (!code || !(await isValidInvitationCode(code))) {
                return NextResponse.json(
                    { error: "A valid invitation code is required" },
                    { status: 401 }
                );
            }
        }

        const requestedStatus = searchParams.get("status");
        let status: Photo["status"] = "approved";
        if (requestedStatus && ["pending", "approved", "rejected"].includes(requestedStatus)) {
            if (requestedStatus !== "approved" && !auth.success) {
                return auth.response;
            }
            status = requestedStatus as Photo["status"];
        }

        const [allPhotos, categories] = await Promise.all([
            listPhotosByStatus(status),
            listCategories(),
        ]);
        const slugById = new Map(categories.map((c) => [c.id, c.slug]));

        let matching: PhotoRow[] = allPhotos
            .map((p) => ({
                ...p,
                category_slug: p.category_id ? (slugById.get(p.category_id) ?? null) : null,
            }))
            .filter((p) => !categorySlug || p.category_slug === categorySlug);

        // People search: restrict to photos the selected person appears in
        // (per the labeled face detections). Composes with the category
        // filter above. Guest-visible by design — the same code gate that
        // protects the photos protects who's in them.
        const personParam = searchParams.get("person");
        if (personParam !== null) {
            // Strict digit check: Number() would coerce "", whitespace, and
            // hex strings into integers that silently query the wrong id.
            if (!/^-?\d+$/.test(personParam)) {
                return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
            }
            const personId = Number(personParam);
            const personFaces = await getFacesByInvitees([personId]);
            const personPhotoIds = new Set(personFaces.map((f) => f.photo_id));
            matching = matching.filter((p) => personPhotoIds.has(p.id));
        }

        // Guest uploads belong on the Guest Photos tab only: the gallery's
        // All Photos tab sends professional=1 to keep them out of the
        // professional sets. Opt-in per request (not blanket) because the
        // moderation dashboard hits this same endpoint and must always see
        // guest uploads.
        if (searchParams.get("professional") === "1") {
            matching = matching.filter((p) => !p.invitation_code);
        }

        // "My uploads": only photos uploaded under the caller's OWN code —
        // the same already-validated code that granted access, so there's no
        // new exposure and no way to view another household's uploads.
        if (searchParams.get("mine") === "1") {
            const ownCode = searchParams.get("code")?.trim().toUpperCase();
            matching = ownCode ? matching.filter((p) => p.invitation_code === ownCode) : [];
        }

        const total = matching.length;
        const rows = matching.slice(offset, offset + limit);

        // Attribution for guest uploads (rows carrying an invitation code) —
        // professional imports have no code and stay unattributed. Only hit
        // the archive when this page actually contains guest uploads.
        // Deliberately NOT gated on isAdmin: the couple browse the gallery
        // logged in, and its lightbox reads uploaded_by from the admin rows —
        // skipping the (tiny) scan would strip their captions.
        const uploaders = rows.some((p) => p.invitation_code)
            ? await listUploaderNames()
            : new Map<string, string>();

        const photos = rows.map((p) => {
            const thumbnail_url = p.thumbnail_key ? cdnUrl(p.thumbnail_key) : null;
            const uploaded_by = p.invitation_code
                ? (uploaders.get(p.invitation_code) ?? null)
                : null;
            if (isAdmin) {
                return { ...p, thumbnail_url, uploaded_by };
            }
            // Public allowlist — never expose invitation_code, s3_key,
            // approved_by, or other internal fields to gallery visitors.
            const publicPhoto: PublicPhoto = {
                id: p.id,
                thumbnail_url,
                width: p.width,
                height: p.height,
                file_name: p.file_name,
                taken_at: p.taken_at,
                category_id: p.category_id,
                category_slug: p.category_slug,
                uploaded_at: p.uploaded_at,
                uploaded_by,
            };
            return publicPhoto;
        });

        return NextResponse.json({ photos, page, limit, total });
    } catch (error) {
        console.error("Error in GET /api/photos:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

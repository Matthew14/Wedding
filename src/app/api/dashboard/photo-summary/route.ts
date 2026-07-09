import { NextRequest, NextResponse } from "next/server";
import { listPhotosByStatus, countPhotosByStatus } from "@/utils/db/photos";
import { listCategories } from "@/utils/db/categories";
import { requireAuth } from "@/utils/auth/requireAuth";
import * as logger from "@/utils/logger";

export interface PhotoSummary {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
    recentUploads: number;
    byCategory: { id: string | null; name: string; count: number }[];
}

const RECENT_DAYS = 7;

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // Approved photos are materialised (the per-category breakdown needs
        // them); the rest are COUNT queries on the byStatus GSI.
        const [approvedPhotos, pending, rejected, categories, ...recentByStatus] =
            await Promise.all([
                listPhotosByStatus("approved"),
                countPhotosByStatus("pending"),
                countPhotosByStatus("rejected"),
                listCategories(),
                countPhotosByStatus("approved", since),
                countPhotosByStatus("pending", since),
                countPhotosByStatus("rejected", since),
            ]);

        const countsByCategory = new Map<string | null, number>();
        for (const photo of approvedPhotos) {
            const key = photo.category_id ?? null;
            countsByCategory.set(key, (countsByCategory.get(key) ?? 0) + 1);
        }

        const byCategory = categories.map((c) => ({
            id: c.id as string | null,
            name: c.name,
            count: countsByCategory.get(c.id) ?? 0,
        }));
        const uncategorised = countsByCategory.get(null) ?? 0;
        if (uncategorised > 0) {
            byCategory.push({ id: null, name: "Uncategorised", count: uncategorised });
        }

        const summary: PhotoSummary = {
            approved: approvedPhotos.length,
            pending,
            rejected,
            total: approvedPhotos.length + pending + rejected,
            recentUploads: recentByStatus.reduce((a, b) => a + b, 0),
            byCategory,
        };

        return NextResponse.json({ summary });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await logger.error("GET /api/dashboard/photo-summary", "DB query failed", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

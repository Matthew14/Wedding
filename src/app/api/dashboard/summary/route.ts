import { NextRequest, NextResponse } from "next/server";
import { getArchiveSummary } from "@/utils/db/archive";
import { requireAuth } from "@/utils/auth/requireAuth";
import * as logger from "@/utils/logger";

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const summary = await getArchiveSummary();
        return NextResponse.json({ summary });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await logger.error("GET /api/dashboard/summary", "DB query failed", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

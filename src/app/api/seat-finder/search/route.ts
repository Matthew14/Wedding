import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "@/utils/api/rateLimit";

export async function GET(request: NextRequest) {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.GENERAL);
    if (!rateLimit.success) return rateLimitedResponse(rateLimit);

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
        return NextResponse.json([]);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("invitees")
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .order("first_name")
        .limit(10);

    if (error) {
        console.error("Seat finder search error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const results = (data ?? []).map((invitee) => ({
        id: invitee.id,
        name: `${invitee.first_name} ${invitee.last_name}`,
    }));

    return NextResponse.json(results);
}

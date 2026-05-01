import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "@/utils/api/rateLimit";

export async function GET(request: NextRequest) {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.GENERAL);
    if (!rateLimit.success) return rateLimitedResponse(rateLimit);

    const idParam = request.nextUrl.searchParams.get("id");
    const inviteeId = idParam ? parseInt(idParam, 10) : NaN;

    if (isNaN(inviteeId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const supabase = await createClient();

    // Look up the invitee to get their invitation_id
    const { data: invitee, error: inviteeError } = await supabase
        .from("invitees")
        .select("invitation_id")
        .eq("id", inviteeId)
        .single();

    if (inviteeError || !invitee) {
        return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Fetch all members of the same invitation
    const { data: party, error: partyError } = await supabase
        .from("invitees")
        .select("id, first_name, last_name, is_primary")
        .eq("invitation_id", invitee.invitation_id)
        .order("is_primary", { ascending: false })
        .order("first_name");

    if (partyError) {
        console.error("Seat finder party error:", partyError);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ party: party ?? [] });
}

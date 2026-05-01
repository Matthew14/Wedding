import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "@/utils/api/rateLimit";

export async function GET(request: NextRequest) {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.GENERAL);
    if (!rateLimit.success) return rateLimitedResponse(rateLimit);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("invitees")
        .select("first_name, last_name, table_number, seat_number")
        .eq("coming", true)
        .not("seat_number", "is", null)
        .order("table_number")
        .order("seat_number");

    if (error) {
        console.error("Seat finder seats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const seats = (data ?? []).map((r) => ({
        tableNumber: r.table_number as string,
        seatNumber: r.seat_number as number,
        name: `${r.first_name} ${r.last_name}`,
    }));

    return NextResponse.json(seats);
}

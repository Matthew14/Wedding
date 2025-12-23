import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createEvent } from "ics";

// Wedding event details
const WEDDING_EVENT = {
    title: "Rebecca & Matthew's Wedding",
    description:
        "Wedding celebration at Gran Villa Rosa, Vilanova i la Geltrú, Spain.",
    location: "Gran Villa Rosa, Vilanova i la Geltrú, Spain",
    url: "https://maps.google.com/?q=Gran+Villa+Rosa,+Vilanova+i+la+Geltrú,+Spain",
    // Friday May 22 to Sunday May 24, 2026 - all-day event
    // Note: iCal end dates are exclusive, so May 25 means "through May 24"
    start: [2026, 5, 22] as [number, number, number],
    end: [2026, 5, 25] as [number, number, number],
    status: "CONFIRMED" as const,
    busyStatus: "BUSY" as const,
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        // Validate code format
        if (!code || code.length !== 6) {
            return NextResponse.json(
                { error: "Invalid RSVP code format" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Verify RSVP code exists
        const { data: rsvpData, error: rsvpError } = await supabase
            .from("RSVPs")
            .select("id, accepted")
            .eq("short_url", code.toUpperCase())
            .single();

        if (rsvpError || !rsvpData) {
            return NextResponse.json(
                { error: "RSVP code not found" },
                { status: 404 }
            );
        }

        // Generate .ics file
        const { error, value } = createEvent(WEDDING_EVENT);

        if (error) {
            console.error("Error generating calendar event:", error);
            return NextResponse.json(
                { error: "Failed to generate calendar event" },
                { status: 500 }
            );
        }

        // Return .ics file with proper headers
        return new NextResponse(value, {
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="rebecca-matthew-wedding.ics"',
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("Error in GET /api/calendar/[code]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

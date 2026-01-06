import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "@/utils/api/rateLimit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        // Rate limit: 10 requests per minute per IP
        const rateLimit = checkRateLimit(request, RATE_LIMITS.RSVP_VALIDATE);
        if (!rateLimit.success) {
            return rateLimitedResponse(rateLimit);
        }

        const { code } = await params;

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid RSVP code format" }, { status: 400 });
        }

        const supabase = await createClient();

        // Check if the RSVP code exists in the RSVPs table
        const { data, error } = await supabase
            .from("RSVPs")
            .select("id, short_url")
            .eq("short_url", code.toUpperCase())
            .single();

        if (error || !data) {
            // Provide helpful suggestions for common mistakes
            const suggestions = [];
            
            // Check for common formatting issues
            if (code.length === 6) {
                suggestions.push("Double-check that you've entered all characters correctly.");
                suggestions.push("Make sure you're using the code from your invitation (not a confirmation code).");
            }
            
            return NextResponse.json(
                {
                    error: "RSVP code not found",
                    suggestion: suggestions.length > 0 ? suggestions[0] : "Please check your invitation and try again. If you continue to have issues, please contact us.",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            valid: true,
            rsvpId: data.id,
            code: data.short_url,
        });
    } catch (error) {
        console.error("Error validating RSVP code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "@/utils/api/rateLimit";

interface Invitee {
    id: string;
    first_name: string;
    last_name: string;
}

/**
 * Parse the slug to extract names and code
 * Format: name-name-CODE or name-CODE
 * The code is always the last 6 characters (alphanumeric)
 */
function parseSlug(slug: string): { names: string[]; code: string } | null {
    // Slug must be at least 8 chars: 1 char name + hyphen + 6 char code
    if (!slug || slug.length < 8) {
        return null;
    }

    const parts = slug.split("-");
    if (parts.length < 2) {
        return null;
    }

    // The last part should be the 6-character code
    const code = parts[parts.length - 1];
    if (code.length !== 6 || !/^[A-Za-z0-9]+$/.test(code)) {
        return null;
    }

    // Everything before the code is the names
    const names = parts.slice(0, -1).filter((name) => name.length > 0);
    if (names.length === 0 || names.length > 2) {
        return null;
    }

    return { names, code };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        // Rate limit: 30 requests per minute per IP
        const rateLimit = checkRateLimit(request, RATE_LIMITS.INVITATION);
        if (!rateLimit.success) {
            return rateLimitedResponse(rateLimit);
        }

        const { slug } = await params;

        // Parse the slug to get names and code
        const parsed = parseSlug(slug);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 404 }
            );
        }

        const { names: urlNames, code } = parsed;

        const supabase = await createClient();

        // Find the RSVP by code
        const { data: rsvpData, error: rsvpError } = await supabase
            .from("RSVPs")
            .select("id, invitation_id, short_url")
            .eq("short_url", code.toUpperCase())
            .single();

        if (rsvpError || !rsvpData) {
            // Generic error - don't reveal if code exists
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 404 }
            );
        }

        // Fetch invitees for this invitation
        const { data: invitees, error: inviteesError } = await supabase
            .from("invitees")
            .select("id, first_name, last_name")
            .eq("invitation_id", rsvpData.invitation_id)
            .order("created_at", { ascending: true });

        if (inviteesError || !invitees || invitees.length === 0) {
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 404 }
            );
        }

        // Get first names from database (lowercase for comparison)
        const dbNames = invitees.map((inv: Invitee) =>
            inv.first_name.toLowerCase()
        );

        // Normalize URL names (lowercase)
        const normalizedUrlNames = urlNames.map((name) => name.toLowerCase());

        // Verify names match (order doesn't matter, but all names must match)
        const namesMatch =
            normalizedUrlNames.length === dbNames.length &&
            normalizedUrlNames.every((name) => dbNames.includes(name)) &&
            dbNames.every((name) => normalizedUrlNames.includes(name));

        if (!namesMatch) {
            // Generic error - don't reveal which part is wrong
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 404 }
            );
        }

        // Format guest names for display
        const formattedNames = invitees.map(
            (inv: Invitee) => inv.first_name
        );

        return NextResponse.json({
            valid: true,
            code: rsvpData.short_url,
            guestNames: formattedNames,
            invitationId: rsvpData.invitation_id,
        });
    } catch (error) {
        console.error("Error validating invitation:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

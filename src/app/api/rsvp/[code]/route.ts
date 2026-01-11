import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkRateLimit, rateLimitedResponse, addRateLimitHeaders, RATE_LIMITS } from "@/utils/api/rateLimit";

// GET: Fetch RSVP data and invitees
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        // Rate limit: 20 requests per minute per IP
        const rateLimit = checkRateLimit(request, RATE_LIMITS.RSVP_SUBMIT);
        if (!rateLimit.success) {
            return rateLimitedResponse(rateLimit);
        }

        const { code } = await params;

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid RSVP code format" }, { status: 400 });
        }

        const supabase = await createClient();

        // Get the RSVP record with invitation data
        const { data: rsvpData, error: rsvpError } = await supabase
            .from("RSVPs")
            .select(`
                id, invitation_id, updated_at, staying_villa, dietary_restrictions,
                song_request, travel_plans, message, accepted,
                invitation:invitation_id (villa_offered)
            `)
            .eq("short_url", code.toUpperCase())
            .single();

        if (rsvpError || !rsvpData) {
            return NextResponse.json({ error: "RSVP code not found" }, { status: 404 });
        }

        // Extract villa_offered from joined invitation data
        // Supabase join can return object or array depending on relationship
        const invitation = rsvpData.invitation;
        const villaOffered = invitation && typeof invitation === 'object' && !Array.isArray(invitation)
            ? (invitation as { villa_offered: boolean }).villa_offered ?? true
            : true;

        // Get invitees for this invitation
        const { data: invitees, error: inviteesError } = await supabase
            .from("invitees")
            .select("id, first_name, last_name, coming, is_primary")
            .eq("invitation_id", rsvpData.invitation_id);

        if (inviteesError) {
            console.error("Error fetching invitees:", inviteesError);
            return NextResponse.json({ error: "Failed to fetch invitees" }, { status: 500 });
        }

        // Convert staying_villa boolean from database to "yes"/"no" string for client form
        const stayingVillaString = rsvpData.staying_villa === true ? "yes" : "no";

        const response = NextResponse.json({
            accepted: rsvpData.accepted,
            rsvpId: rsvpData.id,
            invitationId: rsvpData.invitation_id,
            updatedAt: rsvpData.updated_at,
            stayingVilla: stayingVillaString,
            dietaryRestrictions: rsvpData.dietary_restrictions,
            songRequest: rsvpData.song_request,
            travelPlans: rsvpData.travel_plans,
            message: rsvpData.message,
            invitees: invitees || [],
            villaOffered,
        });
        return addRateLimitHeaders(response, rateLimit);
    } catch (error) {
        console.error("Error fetching RSVP data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Submit RSVP form
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        // Rate limit: 20 requests per minute per IP
        const rateLimit = checkRateLimit(request, RATE_LIMITS.RSVP_SUBMIT);
        if (!rateLimit.success) {
            return rateLimitedResponse(rateLimit);
        }

        const { code } = await params;
        const body = await request.json();

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid RSVP code format" }, { status: 400 });
        }

        const supabase = await createClient();

        // Get the RSVP record
        const { data: rsvpData, error: rsvpError } = await supabase
            .from("RSVPs")
            .select("id, invitation_id")
            .eq("short_url", code.toUpperCase())
            .single();

        if (rsvpError || !rsvpData) {
            return NextResponse.json({ error: "RSVP code not found" }, { status: 404 });
        }

        // Fetch invitation data separately for more reliable villa_offered check
        // This avoids PostgREST join behavior differences between environments
        const { data: invitationData } = await supabase
            .from("invitation")
            .select("villa_offered")
            .eq("id", rsvpData.invitation_id)
            .single();

        // Default to false for security - if we can't verify villa_offered, deny villa selection
        const villaOffered = invitationData?.villa_offered ?? false;

        // Log when villa_offered is undefined - helps detect database/migration issues
        if (invitationData?.villa_offered === undefined) {
            console.error(
                `[RSVP API] villa_offered undefined for invitation ${rsvpData.invitation_id}. ` +
                `This may indicate a missing migration or database issue.`
            );
        }

        // SECURITY: Validate villa booking - prevent staying when not offered
        if (body.staying_villa === "yes" && !villaOffered) {
            return NextResponse.json(
                { error: "Villa accommodation is not available for this invitation" },
                { status: 400 }
            );
        }

        // SECURITY: Validate staying_villa value
        if (body.staying_villa !== undefined && body.staying_villa !== "yes" && body.staying_villa !== "no") {
            return NextResponse.json(
                { error: "Invalid villa accommodation value" },
                { status: 400 }
            );
        }

        // Server-side text field length validation (matches client-side limits)
        const TEXT_LIMITS = {
            dietary_restrictions: 500,
            song_request: 200,
            travel_plans: 500,
            message: 1000,
        } as const;

        for (const [field, maxLength] of Object.entries(TEXT_LIMITS)) {
            const value = body[field];
            if (value && typeof value === 'string' && value.length > maxLength) {
                return NextResponse.json(
                    { error: `${field.replace('_', ' ')} exceeds maximum length of ${maxLength} characters` },
                    { status: 400 }
                );
            }
        }

        // Update the RSVP record with form data
        // Convert staying_villa from "yes"/"no" string to boolean for database
        const stayingVillaBoolean = villaOffered ? body.staying_villa === "yes" : false;

        const { error: updateError } = await supabase
            .from("RSVPs")
            .update({
                accepted: body.accepted,
                staying_villa: stayingVillaBoolean,
                dietary_restrictions: body.dietary_restrictions || null,
                song_request: body.song_request || null,
                travel_plans: body.travel_plans || null,
                message: body.message || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", rsvpData.id);

        if (updateError) {
            console.error("Error updating RSVP:", updateError);
            return NextResponse.json({ error: "Failed to update RSVP" }, { status: 500 });
        }

        // Update individual invitee attendance if provided
        // Security: Only update invitees that belong to this invitation
        // Performance: Use Promise.all to update all invitees in parallel
        if (body.invitees && body.invitees.length > 0) {
            const updateTimestamp = new Date().toISOString();
            const updateResults = await Promise.all(
                body.invitees.map(async (invitee: { id: string; coming: boolean }) => {
                    const { error } = await supabase
                        .from("invitees")
                        .update({
                            coming: invitee.coming,
                            updated_at: updateTimestamp,
                        })
                        .eq("id", invitee.id)
                        .eq("invitation_id", rsvpData.invitation_id);

                    return { inviteeId: invitee.id, error };
                })
            );

            // Collect any failures
            const failures = updateResults.filter(result => result.error);

            if (failures.length > 0) {
                // Log all failures for debugging
                failures.forEach(f => console.error("Error updating invitee:", f.inviteeId, f.error));

                if (failures.length === body.invitees.length) {
                    // All updates failed - return 500
                    return NextResponse.json(
                        { error: "Failed to update invitee attendance" },
                        { status: 500 }
                    );
                }

                // Partial failure - return 207 Multi-Status
                const response = NextResponse.json({
                    success: true,
                    message: "RSVP submitted with some errors",
                    warning: `${failures.length} invitee update(s) failed`,
                    failedInviteeIds: failures.map(f => f.inviteeId),
                }, { status: 207 });
                return addRateLimitHeaders(response, rateLimit);
            }
        }

        const response = NextResponse.json({
            success: true,
            message: "RSVP submitted successfully",
        });
        return addRateLimitHeaders(response, rateLimit);
    } catch (error) {
        console.error("Error submitting RSVP:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

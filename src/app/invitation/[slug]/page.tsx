import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { parseSlug, formatGuestNames } from "@/utils/invitation";
import InvitationContent from "./InvitationContent";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    // Default metadata for invalid/loading states
    const defaultMetadata: Metadata = {
        title: "Wedding Invitation | Rebecca & Matthew",
        description: "You're invited to celebrate the wedding of Rebecca & Matthew on 23rd May 2026 in Barcelona, Spain.",
        openGraph: {
            title: "Wedding Invitation | Rebecca & Matthew",
            description: "You're invited to celebrate the wedding of Rebecca & Matthew on 23rd May 2026 in Barcelona, Spain.",
            type: "website",
            images: [
                {
                    url: "/og-invitation.png",
                    width: 1200,
                    height: 630,
                    alt: "Rebecca & Matthew Wedding Invitation",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: "Wedding Invitation | Rebecca & Matthew",
            description: "You're invited to celebrate the wedding of Rebecca & Matthew on 23rd May 2026 in Barcelona, Spain.",
            images: ["/og-invitation.png"],
        },
    };

    try {
        const parsed = parseSlug(slug);
        if (!parsed) return defaultMetadata;

        const supabase = await createClient();

        // Fetch RSVP by code
        const { data: rsvpData, error: rsvpError } = await supabase
            .from("RSVPs")
            .select("id, invitation_id, short_url")
            .eq("short_url", parsed.code)
            .single();

        if (rsvpError || !rsvpData) return defaultMetadata;

        // Fetch invitees for this invitation
        const { data: invitees, error: inviteesError } = await supabase
            .from("invitees")
            .select("first_name, last_name")
            .eq("invitation_id", rsvpData.invitation_id)
            .order("is_primary", { ascending: false });

        if (inviteesError || !invitees || invitees.length === 0) return defaultMetadata;

        // Validate names match
        const inviteeNames = invitees.map((i) => i.first_name.toLowerCase());
        const urlNames = parsed.names.map((n) => n.toLowerCase());

        if (urlNames.length !== inviteeNames.length) return defaultMetadata;
        if (!urlNames.every((name) => inviteeNames.includes(name))) return defaultMetadata;

        // Generate personalized metadata
        const guestNames = invitees.map((i) => i.first_name);
        const formattedNames = formatGuestNames(guestNames);

        const personalizedTitle = `${formattedNames}, You're Invited!`;
        const personalizedDescription = `Rebecca & Matthew invite ${formattedNames} to celebrate their wedding on 23rd May 2026 at Gran Villa Rosa, Barcelona.`;

        return {
            title: personalizedTitle,
            description: personalizedDescription,
            openGraph: {
                title: personalizedTitle,
                description: personalizedDescription,
                type: "website",
                images: [
                    {
                        url: "/og-invitation.png",
                        width: 1200,
                        height: 630,
                        alt: `Wedding invitation for ${formattedNames}`,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title: personalizedTitle,
                description: personalizedDescription,
                images: ["/og-invitation.png"],
            },
        };
    } catch (error) {
        console.error("Error generating invitation metadata:", error);
        return defaultMetadata;
    }
}

export default async function InvitationPage({ params }: PageProps) {
    const { slug } = await params;
    return <InvitationContent slug={slug} />;
}

import { Resend } from 'resend';

// Initialize Resend client (returns null if API key not configured)
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

// Email recipient for RSVP notifications
const NOTIFICATION_EMAIL = process.env.RSVP_NOTIFICATION_EMAIL;

// Sender email (must be verified in Resend, or use onboarding@resend.dev for testing)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

interface RSVPNotificationData {
    guestNames: string[];
    accepted: boolean;
    attendingCount: number;
    totalInvited: number;
    stayingVilla: boolean | null;
    dietaryRestrictions?: string | null;
    songRequest?: string | null;
    travelPlans?: string | null;
    message?: string | null;
    code: string;
}

/**
 * Sends an email notification when someone submits an RSVP
 * Fails silently if email is not configured (logs warning instead)
 */
export async function sendRSVPNotification(data: RSVPNotificationData): Promise<void> {
    // Skip if email is not configured
    if (!resend) {
        console.warn('[Email] Resend API key not configured, skipping RSVP notification');
        return;
    }

    if (!NOTIFICATION_EMAIL) {
        console.warn('[Email] RSVP_NOTIFICATION_EMAIL not configured, skipping notification');
        return;
    }

    const {
        guestNames,
        accepted,
        attendingCount,
        totalInvited,
        stayingVilla,
        dietaryRestrictions,
        songRequest,
        travelPlans,
        message,
        code,
    } = data;

    const primaryGuest = guestNames[0] || 'Unknown Guest';
    const status = accepted ? 'Accepted' : 'Declined';

    const subject = accepted
        ? `RSVP: ${primaryGuest} is coming! (${attendingCount}/${totalInvited} attending)`
        : `RSVP: ${primaryGuest} can't make it`;

    // Build email body
    const sections: string[] = [
        `<h2>New RSVP Received</h2>`,
        `<p><strong>Status:</strong> ${status}</p>`,
        `<p><strong>Guests:</strong> ${guestNames.join(', ')}</p>`,
    ];

    if (accepted) {
        sections.push(`<p><strong>Attending:</strong> ${attendingCount} of ${totalInvited} invited</p>`);

        if (stayingVilla !== null) {
            sections.push(`<p><strong>Villa Accommodation:</strong> ${stayingVilla ? 'Yes' : 'No'}</p>`);
        }
    }

    if (dietaryRestrictions) {
        sections.push(`<p><strong>Dietary Restrictions:</strong> ${escapeHtml(dietaryRestrictions)}</p>`);
    }

    if (songRequest) {
        sections.push(`<p><strong>Song Request:</strong> ${escapeHtml(songRequest)}</p>`);
    }

    if (travelPlans) {
        sections.push(`<p><strong>Travel Plans:</strong> ${escapeHtml(travelPlans)}</p>`);
    }

    if (message) {
        sections.push(`<p><strong>Message:</strong></p><blockquote>${escapeHtml(message)}</blockquote>`);
    }

    sections.push(`<hr/><p style="color: #666; font-size: 12px;">RSVP Code: ${code}</p>`);

    const html = sections.join('\n');

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: NOTIFICATION_EMAIL,
            subject,
            html,
        });

        if (error) {
            console.error('[Email] Failed to send RSVP notification:', error);
        } else {
            console.log(`[Email] RSVP notification sent for ${primaryGuest}`);
        }
    } catch (error) {
        console.error('[Email] Error sending RSVP notification:', error);
    }
}

/**
 * Escapes HTML special characters to prevent XSS in email content
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// RSVP amendment deadline: 28th February 2026 at 23:59 Irish time (GMT/UTC in winter)
export const RSVP_DEADLINE = new Date("2026-02-28T23:59:00.000Z");

// Invitation IDs exempt from the deadline (can still edit after deadline)
const DEADLINE_EXEMPT_INVITATION_IDS = [4, 7];

export function isRSVPClosed(now: Date = new Date()): boolean {
    return now >= RSVP_DEADLINE;
}

export function isInvitationExemptFromDeadline(invitationId: number): boolean {
    return DEADLINE_EXEMPT_INVITATION_IDS.includes(invitationId);
}

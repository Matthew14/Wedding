// Invitation IDs that are exempt from the RSVP deadline and can edit without authentication
const EXEMPT_INVITATION_IDS = [4, 7];

export function isInvitationExemptFromDeadline(invitationId: number): boolean {
    return EXEMPT_INVITATION_IDS.includes(invitationId);
}

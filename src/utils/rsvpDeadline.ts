// RSVP amendment deadline: 28th February 2026 at 23:59 Irish time (GMT/UTC in winter)
export const RSVP_DEADLINE = new Date("2026-02-28T23:59:00.000Z");

export function isRSVPClosed(now: Date = new Date()): boolean {
    return now >= RSVP_DEADLINE;
}

import { describe, it, expect } from "vitest";
import { RSVP_DEADLINE, isRSVPClosed } from "../rsvpDeadline";

describe("rsvpDeadline", () => {
    it("RSVP_DEADLINE is set to 28 Feb 2026 23:59 UTC (Irish time in winter)", () => {
        expect(RSVP_DEADLINE.toISOString()).toBe("2026-02-28T23:59:00.000Z");
    });

    it("returns false before the deadline", () => {
        expect(isRSVPClosed(new Date("2026-02-28T23:58:59.999Z"))).toBe(false);
    });

    it("returns true at exactly the deadline", () => {
        expect(isRSVPClosed(new Date("2026-02-28T23:59:00.000Z"))).toBe(true);
    });

    it("returns true after the deadline", () => {
        expect(isRSVPClosed(new Date("2026-02-28T23:59:00.001Z"))).toBe(true);
        expect(isRSVPClosed(new Date("2026-03-01T00:00:00.000Z"))).toBe(true);
    });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockGetInviteesByCode = vi.fn();

vi.mock("@/utils/db/archive", () => ({
    getInviteesByCode: (...args: unknown[]) => mockGetInviteesByCode(...args),
}));

function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/photos/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /api/photos/validate-code", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns valid with invitee first names for a known code", async () => {
        mockGetInviteesByCode.mockResolvedValue(["Matthew", "Jim", "Sarah"]);
        const res = await POST(makeRequest({ code: "abc123" }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ valid: true, names: ["Matthew", "Jim", "Sarah"] });
        // Codes are stored uppercase
        expect(mockGetInviteesByCode).toHaveBeenCalledWith("ABC123");
    });

    it("returns invalid for an unknown code", async () => {
        mockGetInviteesByCode.mockResolvedValue(null);
        const res = await POST(makeRequest({ code: "ZZZZZZ" }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
        expect(data.names).toBeUndefined();
    });

    it("rejects a missing code", async () => {
        const res = await POST(makeRequest({}));
        expect(res.status).toBe(400);
    });

    it("rejects a non-string code", async () => {
        const res = await POST(makeRequest({ code: 123456 }));
        expect(res.status).toBe(400);
    });

    it("handles database errors", async () => {
        mockGetInviteesByCode.mockRejectedValue(new Error("DB error"));
        const res = await POST(makeRequest({ code: "ABC123" }));
        expect(res.status).toBe(500);
    });
});

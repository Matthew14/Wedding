import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockRequireAuth = vi.fn();
const mockListAllInvitees = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/archive", () => ({
    listAllInvitees: (...args: unknown[]) => mockListAllInvitees(...args),
}));

describe("GET /api/dashboard/faces/invitees", () => {
    beforeEach(() => vi.clearAllMocks());

    it("requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/invitees"));
        expect(res.status).toBe(401);
        expect(mockListAllInvitees).not.toHaveBeenCalled();
    });

    it("returns the invitee list for the picker", async () => {
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        const invitees = [{ id: 7, invitation_id: 3, name: "Aoife Byrne", code: "ABC123" }];
        mockListAllInvitees.mockResolvedValue(invitees);
        const res = await GET(new NextRequest("http://localhost/api/dashboard/faces/invitees"));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ invitees });
    });
});

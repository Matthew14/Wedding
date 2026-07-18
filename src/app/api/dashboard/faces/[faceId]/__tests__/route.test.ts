import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

const mockRequireAuth = vi.fn();
const mockDetachFace = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@/utils/db/faces", () => ({
    detachFace: (...args: unknown[]) => mockDetachFace(...args),
}));

const params = { params: Promise.resolve({ faceId: "face-1" }) };
const req = (body: unknown) =>
    new NextRequest("http://localhost/api/dashboard/faces/face-1", {
        method: "PATCH",
        body: JSON.stringify(body),
    });

describe("PATCH /api/dashboard/faces/[faceId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        mockDetachFace.mockResolvedValue(true);
    });

    it("requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await PATCH(req({ detach: true }), params);
        expect(res.status).toBe(401);
        expect(mockDetachFace).not.toHaveBeenCalled();
    });

    it("detaches the face", async () => {
        const res = await PATCH(req({ detach: true }), params);
        expect(res.status).toBe(200);
        expect(mockDetachFace).toHaveBeenCalledWith("face-1");
        expect(await res.json()).toEqual({ face_id: "face-1", detached: true });
    });

    it("rejects a body without detach: true", async () => {
        const res = await PATCH(req({}), params);
        expect(res.status).toBe(400);
        expect(mockDetachFace).not.toHaveBeenCalled();
    });

    it("404s for an unknown face", async () => {
        mockDetachFace.mockResolvedValue(false);
        const res = await PATCH(req({ detach: true }), params);
        expect(res.status).toBe(404);
    });
});

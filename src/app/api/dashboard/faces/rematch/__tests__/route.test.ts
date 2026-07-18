import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockLambdaSend = vi.fn();

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));
vi.mock("@aws-sdk/client-lambda", () => ({
    LambdaClient: class {
        send = (...args: unknown[]) => mockLambdaSend(...args);
    },
    InvokeCommand: class {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    },
}));

import { POST } from "../route";

const req = () =>
    new NextRequest("http://localhost/api/dashboard/faces/rematch", { method: "POST" });

describe("POST /api/dashboard/faces/rematch", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({ success: true, payload: {} });
        mockLambdaSend.mockResolvedValue({});
    });

    it("requires auth", async () => {
        mockRequireAuth.mockResolvedValue({
            success: false,
            response: new Response(null, { status: 401 }),
        });
        const res = await POST(req());
        expect(res.status).toBe(401);
        expect(mockLambdaSend).not.toHaveBeenCalled();
    });

    it("async-invokes the photo-processor with the rematch action", async () => {
        const res = await POST(req());
        expect(res.status).toBe(202);
        expect(await res.json()).toEqual({ started: true });

        const cmd = mockLambdaSend.mock.calls[0][0] as {
            input: { FunctionName: string; InvocationType: string; Payload: string };
        };
        expect(cmd.input.FunctionName).toBe("wedding-photo-processor");
        expect(cmd.input.InvocationType).toBe("Event");
        expect(JSON.parse(cmd.input.Payload)).toEqual({ action: "rematch_faces" });
    });

    it("returns 500 when the invocation fails", async () => {
        mockLambdaSend.mockRejectedValue(new Error("boom"));
        const res = await POST(req());
        expect(res.status).toBe(500);
    });
});

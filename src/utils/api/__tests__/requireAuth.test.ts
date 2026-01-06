import { describe, it, expect, vi } from "vitest";
import { requireAuth } from "../requireAuth";
import { SupabaseClient } from "@supabase/supabase-js";

describe("requireAuth", () => {
    it("returns success with user when authenticated", async () => {
        const mockUser = { id: "test-user-id", email: "test@example.com" };
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: null,
                }),
            },
        } as unknown as SupabaseClient;

        const result = await requireAuth(mockSupabase);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.user).toEqual(mockUser);
        }
    });

    it("returns failure response when user is null", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: null,
                }),
            },
        } as unknown as SupabaseClient;

        const result = await requireAuth(mockSupabase);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.response.status).toBe(401);
            const data = await result.response.json();
            expect(data.error).toBe("Unauthorized");
        }
    });

    it("returns failure response when auth service returns an error", async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "Auth service unavailable" },
                }),
            },
        } as unknown as SupabaseClient;

        const result = await requireAuth(mockSupabase);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.response.status).toBe(401);
            const data = await result.response.json();
            expect(data.error).toBe("Unauthorized");
        }
    });

    it("returns failure when auth error exists even if user is present", async () => {
        const mockUser = { id: "test-user-id", email: "test@example.com" };
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: mockUser },
                    error: { message: "Token expired" },
                }),
            },
        } as unknown as SupabaseClient;

        const result = await requireAuth(mockSupabase);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.response.status).toBe(401);
        }
    });
});

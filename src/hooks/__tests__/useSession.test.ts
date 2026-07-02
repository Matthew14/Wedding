import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSession } from "../useSession";

const mockFetch = vi.fn();

describe("useSession", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        mockFetch.mockReset();
    });

    it("resolves to authenticated on a 200 from /api/auth/me", async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const { result } = renderHook(() => useSession());
        expect(result.current.status).toBe("loading");
        await waitFor(() => expect(result.current.status).toBe("authenticated"));
    });

    it("resolves to unauthenticated on a 401", async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 401 }));
        const { result } = renderHook(() => useSession());
        await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    });

    it("fails closed when the initial check throws", async () => {
        mockFetch.mockRejectedValue(new Error("network down"));
        const { result } = renderHook(() => useSession());
        await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    });

    it("keeps an established session when a re-check throws", async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const { result } = renderHook(() => useSession());
        await waitFor(() => expect(result.current.status).toBe("authenticated"));

        mockFetch.mockRejectedValue(new Error("network blip"));
        await act(() => result.current.refresh());

        expect(result.current.status).toBe("authenticated");
    });

    it("drops the session when a re-check returns 401", async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
        const { result } = renderHook(() => useSession());
        await waitFor(() => expect(result.current.status).toBe("authenticated"));

        mockFetch.mockResolvedValue(new Response(null, { status: 401 }));
        await act(() => result.current.refresh());

        expect(result.current.status).toBe("unauthenticated");
    });
});

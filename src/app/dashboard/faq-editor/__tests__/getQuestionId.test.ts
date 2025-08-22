import { describe, it, expect, vi, beforeEach } from "vitest";
import { getQuestionId } from "../getQuestionId";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("FAQ ID Generator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("generates ID successfully", async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({ questionId: "wedding-venue" }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getQuestionId("Where is the wedding venue?");

        expect(result).toBe("wedding-venue");
        expect(mockFetch).toHaveBeenCalledWith("/api/generate-faq-id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: "Where is the wedding venue?" }),
        });
    });

    it("handles API errors gracefully", async () => {
        const mockResponse = {
            ok: false,
            status: 500,
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getQuestionId("What time is the ceremony?");

        expect(result).toBe("what-time-is-the-ceremony");
    });

    it("handles network errors", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const result = await getQuestionId("What should I wear?");

        expect(result).toBe("what-should-i-wear");
    });

    it("handles rate limiting (429)", async () => {
        const mockResponse = {
            ok: false,
            status: 429,
            json: () =>
                Promise.resolve({
                    error: "Too many requests",
                    resetTime: Date.now() + 60000,
                }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getQuestionId("Are kids welcome?");

        expect(result).toBe("are-kids-welcome");
    });

    it("generates fallback ID with proper formatting", async () => {
        mockFetch.mockRejectedValue(new Error("API Error"));

        const testCases = [
            { input: "What time is the ceremony?", expected: "what-time-is-the-ceremony" },
            { input: "Where should I park my car?", expected: "where-should-i-park-my-car" },
            { input: "Are kids welcome at the wedding?", expected: "are-kids-welcome-at-the-wedding" },
            { input: "   Multiple   Spaces   Here   ", expected: "multiple-spaces-here" },
            { input: "Special@Characters#Here!", expected: "special-characters-here" },
        ];

        for (const { input, expected } of testCases) {
            const result = await getQuestionId(input);
            expect(result).toBe(expected);
        }
    });

    it("handles empty or invalid input", async () => {
        mockFetch.mockRejectedValue(new Error("API Error"));

        expect(await getQuestionId("")).toBe("unknown");
        expect(await getQuestionId("   ")).toBe("unknown");
    });
});

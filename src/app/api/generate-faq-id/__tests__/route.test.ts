import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Simple mock of OpenAI
vi.mock("openai", () => ({
    default: class MockOpenAI {
        chat = {
            completions: {
                create: vi.fn(),
            },
        };
    },
}));

describe("/api/generate-faq-id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("validates question input", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: "" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Question is required and must be a string");
    });

    it("validates question type", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: 123 }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Question is required and must be a string");
    });

    it("handles OpenAI API errors with fallback", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id?question=What%20time%20ceremony", {
            method: "POST",
            body: JSON.stringify({ question: "What time is the ceremony?" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.questionId).toBeDefined();
        // Should get fallback since OpenAI is mocked and will fail
    });
});

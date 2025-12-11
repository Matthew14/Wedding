import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("/api/generate-faq-id", () => {
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

    it("generates kebab-case ID from first 3 words", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: "What time is the ceremony?" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.questionId).toBe("what-time-is");
    });

    it("handles questions with punctuation", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: "What's the dress code?" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.questionId).toBe("whats-the-dress");
    });

    it("handles questions with less than 3 words", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: "When?" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.questionId).toBe("when");
    });

    it("handles questions with extra whitespace", async () => {
        const { POST } = await import("../route");

        const request = new NextRequest("http://localhost:3000/api/generate-faq-id", {
            method: "POST",
            body: JSON.stringify({ question: "  How   do   I   get   there?  " }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.questionId).toBe("how-do-i");
    });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

// Mock Supabase
const mockSupabaseClient = {
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
    })),
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe("/api/faqs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/faqs", () => {
        it("returns FAQs successfully", async () => {
            const mockFAQs = [
                { id: "test-1", question: "Test Q1", answer: "Test A1", created_at: "2024-01-01" },
                { id: "test-2", question: "Test Q2", answer: "Test A2", created_at: "2024-01-02" },
            ];

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockFAQs,
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.faqs).toEqual(mockFAQs);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith("FAQs");
        });

        it("handles database errors", async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database error" },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to fetch FAQs");
        });
    });

    describe("POST /api/faqs", () => {
        it("creates FAQ successfully", async () => {
            const newFAQ = { id: "new-faq", question: "New Question", answer: "New Answer" };

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: newFAQ,
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify(newFAQ),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.faq).toEqual(newFAQ);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith("FAQs");
        });

        it("validates required fields", async () => {
            const invalidFAQ = { question: "", answer: "Some answer" };

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify(invalidFAQ),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Question and answer are required");
        });

        it("handles database errors during creation", async () => {
            const newFAQ = { question: "Valid Question", answer: "Valid Answer" };

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Insert failed" },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify(newFAQ),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to create FAQ");
        });

        it("trims input data", async () => {
            const faqWithWhitespace = {
                id: "  test-id  ",
                question: "  Test Question  ",
                answer: "  Test Answer  ",
            };

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: "test-id", question: "Test Question", answer: "Test Answer" },
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify(faqWithWhitespace),
            });

            await POST(request);

            // Verify insert was called with trimmed data
            expect(mockChain.insert).toHaveBeenCalledWith([
                {
                    id: "test-id",
                    question: "Test Question",
                    answer: "Test Answer",
                },
            ]);
        });
    });
});

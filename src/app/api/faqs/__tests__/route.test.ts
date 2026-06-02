import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

const mockQuery = vi.fn();

vi.mock("@/utils/db/client", () => ({
    getDb: () => ({ query: mockQuery }),
}));

vi.mock("@/utils/auth/requireAuth", () => ({
    requireAuth: vi.fn(),
}));

import { requireAuth } from "@/utils/auth/requireAuth";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

const authenticated = () =>
    mockRequireAuth.mockResolvedValue({ success: true, payload: { email: "admin@test.com" } });

const unauthenticated = () =>
    mockRequireAuth.mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

describe("/api/faqs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/faqs", () => {
        it("returns FAQs successfully", async () => {
            const mockFAQs = [
                { id: "test-1", question: "Q1", answer: "A1", created_at: "2024-01-01" },
            ];
            mockQuery.mockResolvedValue({ rows: mockFAQs });

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.faqs).toEqual(mockFAQs);
        });

        it("handles database errors", async () => {
            mockQuery.mockRejectedValue(new Error("DB error"));

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Internal server error");
        });
    });

    describe("POST /api/faqs", () => {
        it("returns 401 when not authenticated", async () => {
            unauthenticated();

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify({ question: "Test", answer: "Test" }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it("creates FAQ successfully when authenticated", async () => {
            authenticated();
            const newFAQ = { id: "new-faq", question: "New Question", answer: "New Answer" };
            mockQuery.mockResolvedValue({ rows: [newFAQ] });

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify(newFAQ),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.faq).toEqual(newFAQ);
        });

        it("validates required fields", async () => {
            authenticated();

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify({ question: "", answer: "Some answer" }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Question and answer are required");
        });

        it("handles database errors during creation", async () => {
            authenticated();
            mockQuery.mockRejectedValue(new Error("Insert failed"));

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify({ question: "Valid Q", answer: "Valid A" }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Internal server error");
        });

        it("trims input data before inserting", async () => {
            authenticated();
            mockQuery.mockResolvedValue({ rows: [{ id: "test-id", question: "Test Q", answer: "Test A" }] });

            const request = new NextRequest("http://localhost:3000/api/faqs", {
                method: "POST",
                body: JSON.stringify({ id: "  test-id  ", question: "  Test Q  ", answer: "  Test A  " }),
            });

            await POST(request);

            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toContain("INSERT INTO faqs");
            expect(params).toContain("test-id");
            expect(params).toContain("Test Q");
            expect(params).toContain("Test A");
        });
    });
});

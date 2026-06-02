import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "../route";

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

const createParams = (id: string) => Promise.resolve({ id });

describe("/api/faqs/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/faqs/[id]", () => {
        it("returns FAQ successfully", async () => {
            const mockFAQ = { id: "test-1", question: "Test Q", answer: "Test A" };
            mockQuery.mockResolvedValue({ rows: [mockFAQ] });

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1");
            const response = await GET(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.faq).toEqual(mockFAQ);
        });

        it("returns 404 for non-existent FAQ", async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const request = new NextRequest("http://localhost:3000/api/faqs/nonexistent");
            const response = await GET(request, { params: createParams("nonexistent") });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("FAQ not found");
        });

        it("handles database errors", async () => {
            mockQuery.mockRejectedValue(new Error("DB error"));

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1");
            const response = await GET(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Internal server error");
        });
    });

    describe("PUT /api/faqs/[id]", () => {
        it("returns 401 when not authenticated", async () => {
            unauthenticated();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "PUT",
                body: JSON.stringify({ question: "Updated Q", answer: "Updated A" }),
            });

            const response = await PUT(request, { params: createParams("test-1") });
            expect(response.status).toBe(401);
        });

        it("updates FAQ successfully when authenticated", async () => {
            authenticated();
            const updatedFAQ = { id: "test-1", question: "Updated Q", answer: "Updated A" };
            mockQuery.mockResolvedValue({ rows: [updatedFAQ] });

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "PUT",
                body: JSON.stringify({ question: "Updated Q", answer: "Updated A" }),
            });

            const response = await PUT(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.faq).toEqual(updatedFAQ);
        });

        it("validates required fields", async () => {
            authenticated();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "PUT",
                body: JSON.stringify({ question: "", answer: "Some answer" }),
            });

            const response = await PUT(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Question and answer are required");
        });

        it("returns 404 when FAQ not found", async () => {
            authenticated();
            mockQuery.mockResolvedValue({ rows: [] });

            const request = new NextRequest("http://localhost:3000/api/faqs/nonexistent", {
                method: "PUT",
                body: JSON.stringify({ question: "Q", answer: "A" }),
            });

            const response = await PUT(request, { params: createParams("nonexistent") });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("FAQ not found");
        });
    });

    describe("DELETE /api/faqs/[id]", () => {
        it("returns 401 when not authenticated", async () => {
            unauthenticated();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            expect(response.status).toBe(401);
        });

        it("deletes FAQ successfully when authenticated", async () => {
            authenticated();
            mockQuery.mockResolvedValue({ rows: [] });

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe("FAQ deleted successfully");
        });

        it("handles database errors during deletion", async () => {
            authenticated();
            mockQuery.mockRejectedValue(new Error("Delete failed"));

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Internal server error");
        });
    });
});

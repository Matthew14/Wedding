import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "../route";

// Mock Supabase
const mockGetUser = vi.fn();
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
    auth: {
        getUser: mockGetUser,
    },
};

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Helper to mock authenticated user
const mockAuthenticatedUser = () => {
    mockGetUser.mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
    });
};

// Helper to mock unauthenticated user
const mockUnauthenticatedUser = () => {
    mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
    });
};

// Helper to create params promise
const createParams = (id: string) => Promise.resolve({ id });

// Helper to create a complete mock chain with all methods
const createMockChain = (overrides: Record<string, unknown> = {}) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    ...overrides,
});

describe("/api/faqs/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/faqs/[id]", () => {
        it("returns FAQ successfully", async () => {
            const mockFAQ = { id: "test-1", question: "Test Q", answer: "Test A" };

            const mockChain = createMockChain({
                single: vi.fn().mockResolvedValue({
                    data: mockFAQ,
                    error: null,
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1");
            const response = await GET(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.faq).toEqual(mockFAQ);
        });

        it("returns 404 for non-existent FAQ", async () => {
            const mockChain = createMockChain({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "Not found" },
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs/nonexistent");
            const response = await GET(request, { params: createParams("nonexistent") });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe("FAQ not found");
        });
    });

    describe("PUT /api/faqs/[id]", () => {
        it("returns 401 when user is not authenticated", async () => {
            mockUnauthenticatedUser();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "PUT",
                body: JSON.stringify({ question: "Updated Q", answer: "Updated A" }),
            });

            const response = await PUT(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("updates FAQ successfully when authenticated", async () => {
            mockAuthenticatedUser();
            const updatedFAQ = { id: "test-1", question: "Updated Q", answer: "Updated A" };

            const mockChain = createMockChain({
                single: vi.fn().mockResolvedValue({
                    data: updatedFAQ,
                    error: null,
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

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
            mockAuthenticatedUser();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "PUT",
                body: JSON.stringify({ question: "", answer: "Some answer" }),
            });

            const response = await PUT(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Question and answer are required");
        });

        it("returns 404 for non-existent FAQ", async () => {
            mockAuthenticatedUser();

            const mockChain = createMockChain({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "Not found" },
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

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
        it("returns 401 when user is not authenticated", async () => {
            mockUnauthenticatedUser();

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("deletes FAQ successfully when authenticated", async () => {
            mockAuthenticatedUser();

            const mockChain = createMockChain({
                eq: vi.fn().mockResolvedValue({
                    error: null,
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe("FAQ deleted successfully");
        });

        it("handles database errors during deletion", async () => {
            mockAuthenticatedUser();

            const mockChain = createMockChain({
                eq: vi.fn().mockResolvedValue({
                    error: { message: "Delete failed" },
                }),
            });
            mockSupabaseClient.from.mockReturnValue(mockChain);

            const request = new NextRequest("http://localhost:3000/api/faqs/test-1", {
                method: "DELETE",
            });

            const response = await DELETE(request, { params: createParams("test-1") });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe("Failed to delete FAQ");
        });
    });
});

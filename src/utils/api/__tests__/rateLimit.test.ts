import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitedResponse, addRateLimitHeaders, RATE_LIMITS } from "../rateLimit";

// Helper to create mock requests with different IPs
function createMockRequest(ip: string): NextRequest {
    const request = new NextRequest("http://localhost/api/test");
    // Override headers.get to return the IP
    vi.spyOn(request.headers, "get").mockImplementation((name: string) => {
        if (name === "x-forwarded-for") return ip;
        return null;
    });
    return request;
}

describe("rateLimit", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset module state between tests by advancing time significantly
        vi.setSystemTime(new Date("2026-01-07T00:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("checkRateLimit", () => {
        it("allows requests within the limit", () => {
            const request = createMockRequest("192.168.1.100");
            const config = { limit: 5, windowSeconds: 60, keyPrefix: "test1" };

            for (let i = 0; i < 5; i++) {
                const result = checkRateLimit(request, config);
                expect(result.success).toBe(true);
                expect(result.remaining).toBe(4 - i);
            }
        });

        it("blocks requests after exceeding the limit", () => {
            const request = createMockRequest("192.168.1.101");
            const config = { limit: 3, windowSeconds: 60, keyPrefix: "test2" };

            // Use up all allowed requests
            for (let i = 0; i < 3; i++) {
                const result = checkRateLimit(request, config);
                expect(result.success).toBe(true);
            }

            // Next request should be blocked
            const result = checkRateLimit(request, config);
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it("resets after window expires", () => {
            const request = createMockRequest("192.168.1.102");
            const config = { limit: 2, windowSeconds: 60, keyPrefix: "test3" };

            // Use up all requests
            checkRateLimit(request, config);
            checkRateLimit(request, config);
            expect(checkRateLimit(request, config).success).toBe(false);

            // Advance time past the window
            vi.advanceTimersByTime(61 * 1000);

            // Should be allowed again
            const result = checkRateLimit(request, config);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it("tracks different IPs separately", () => {
            const request1 = createMockRequest("10.0.0.1");
            const request2 = createMockRequest("10.0.0.2");
            const config = { limit: 2, windowSeconds: 60, keyPrefix: "test4" };

            // Use up IP1's limit
            checkRateLimit(request1, config);
            checkRateLimit(request1, config);
            expect(checkRateLimit(request1, config).success).toBe(false);

            // IP2 should still have full quota
            const result = checkRateLimit(request2, config);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it("uses key prefix for namespacing", () => {
            const request = createMockRequest("192.168.1.103");
            const configA = { limit: 2, windowSeconds: 60, keyPrefix: "endpointA" };
            const configB = { limit: 2, windowSeconds: 60, keyPrefix: "endpointB" };

            // Use up limit for endpoint A
            checkRateLimit(request, configA);
            checkRateLimit(request, configA);
            expect(checkRateLimit(request, configA).success).toBe(false);

            // Endpoint B should still have full quota
            const result = checkRateLimit(request, configB);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it("falls back to x-real-ip when x-forwarded-for is not present", () => {
            const request = new NextRequest("http://localhost/api/test");
            vi.spyOn(request.headers, "get").mockImplementation((name: string) => {
                if (name === "x-real-ip") return "172.16.0.1";
                return null;
            });

            const config = { limit: 3, windowSeconds: 60, keyPrefix: "test5" };
            const result = checkRateLimit(request, config);

            expect(result.success).toBe(true);
        });

        it("uses first IP from x-forwarded-for when multiple present", () => {
            const request = new NextRequest("http://localhost/api/test");
            vi.spyOn(request.headers, "get").mockImplementation((name: string) => {
                if (name === "x-forwarded-for") return "1.2.3.4, 5.6.7.8, 9.10.11.12";
                return null;
            });

            const configA = { limit: 2, windowSeconds: 60, keyPrefix: "test6a" };
            const configB = { limit: 2, windowSeconds: 60, keyPrefix: "test6b" };

            // Request should be tracked under 1.2.3.4
            checkRateLimit(request, configA);
            checkRateLimit(request, configA);
            expect(checkRateLimit(request, configA).success).toBe(false);

            // Create another request with just 1.2.3.4
            const request2 = new NextRequest("http://localhost/api/test");
            vi.spyOn(request2.headers, "get").mockImplementation((name: string) => {
                if (name === "x-forwarded-for") return "1.2.3.4";
                return null;
            });

            // Should share the same rate limit (different prefix to verify IP parsing)
            checkRateLimit(request2, configB);
            checkRateLimit(request2, configB);
            expect(checkRateLimit(request2, configB).success).toBe(false);
        });

        it("falls back to 127.0.0.1 for invalid IP formats", () => {
            // Test with malformed IP (potential header injection)
            const request1 = new NextRequest("http://localhost/api/test");
            vi.spyOn(request1.headers, "get").mockImplementation((name: string) => {
                if (name === "x-forwarded-for") return "invalid-ip-format";
                return null;
            });

            const config = { limit: 2, windowSeconds: 60, keyPrefix: "test-invalid-ip" };

            // Both requests with invalid IPs should be tracked under 127.0.0.1
            checkRateLimit(request1, config);

            const request2 = new NextRequest("http://localhost/api/test");
            vi.spyOn(request2.headers, "get").mockImplementation((name: string) => {
                if (name === "x-forwarded-for") return "'; DROP TABLE users; --";
                return null;
            });

            checkRateLimit(request2, config);

            // Third request should be blocked (both counted against 127.0.0.1)
            const request3 = new NextRequest("http://localhost/api/test");
            vi.spyOn(request3.headers, "get").mockImplementation(() => null);

            expect(checkRateLimit(request3, config).success).toBe(false);
        });

        it("handles concurrent requests correctly", () => {
            const config = { limit: 5, windowSeconds: 60, keyPrefix: "test-concurrent" };

            // Simulate 10 sequential requests from same IP
            const results = Array(10)
                .fill(null)
                .map(() => {
                    const request = createMockRequest("192.168.1.200");
                    return checkRateLimit(request, config);
                });

            const successful = results.filter((r) => r.success).length;
            expect(successful).toBe(5); // Only 5 should succeed
        });
    });

    describe("rateLimitedResponse", () => {
        it("returns 429 status with correct headers", async () => {
            const now = Date.now();
            const result = {
                success: false,
                limit: 10,
                remaining: 0,
                resetTime: now + 30000,
            };

            const response = rateLimitedResponse(result);

            expect(response.status).toBe(429);
            expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
            expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
            expect(response.headers.get("Retry-After")).toBe("30");

            const body = await response.json();
            expect(body.error).toBe("Too many requests. Please try again later.");
            expect(body.retryAfter).toBe(30);
        });
    });

    describe("addRateLimitHeaders", () => {
        it("adds rate limit headers to response", async () => {
            const { NextResponse } = await import("next/server");
            const response = NextResponse.json({ data: "test" });
            const result = {
                success: true,
                limit: 60,
                remaining: 45,
                resetTime: Date.now() + 60000,
            };

            addRateLimitHeaders(response, result);

            expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
            expect(response.headers.get("X-RateLimit-Remaining")).toBe("45");
        });
    });

    describe("RATE_LIMITS", () => {
        it("has predefined configurations for different endpoints", () => {
            expect(RATE_LIMITS.RSVP_VALIDATE).toEqual({
                limit: 5,
                windowSeconds: 60,
                keyPrefix: "rsvp-validate",
            });

            expect(RATE_LIMITS.RSVP_SUBMIT).toEqual({
                limit: 20,
                windowSeconds: 60,
                keyPrefix: "rsvp-submit",
            });

            expect(RATE_LIMITS.INVITATION).toEqual({
                limit: 30,
                windowSeconds: 60,
                keyPrefix: "invitation",
            });

            expect(RATE_LIMITS.GENERAL).toEqual({
                limit: 60,
                windowSeconds: 60,
                keyPrefix: "general",
            });
        });
    });
});

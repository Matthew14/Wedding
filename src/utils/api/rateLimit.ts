import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for serverless environments.
 *
 * Note: This provides per-instance rate limiting. In serverless environments
 * like Vercel, each instance maintains its own counter. This provides reasonable
 * protection against brute-force attacks while keeping the implementation simple.
 *
 * For distributed rate limiting, consider using Upstash Redis.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

/** Response structure for rate limit errors */
export interface RateLimitErrorResponse {
    error: string;
    retryAfter: number;
}

// Store for rate limit entries (per IP)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 10000; // Maximum entries before forced cleanup
let lastCleanup = Date.now();

function cleanupOldEntries() {
    const now = Date.now();
    // Run cleanup if interval passed OR if we've exceeded max entries
    if (now - lastCleanup < CLEANUP_INTERVAL && rateLimitStore.size < MAX_ENTRIES) {
        return;
    }

    lastCleanup = now;
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}

// IPv4 and IPv6 validation patterns
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^[0-9a-fA-F:]+$/;

/**
 * Validate IP address format to prevent header spoofing
 */
function isValidIp(ip: string): boolean {
    return IPV4_PATTERN.test(ip) || IPV6_PATTERN.test(ip);
}

/**
 * Get the client IP address from the request
 */
function getClientIp(request: NextRequest): string {
    // Vercel and other proxies set x-forwarded-for
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const ip = forwardedFor.split(",")[0].trim();
        // Validate IP format to prevent injection/spoofing
        if (isValidIp(ip)) {
            return ip;
        }
    }

    // Fallback to x-real-ip
    const realIp = request.headers.get("x-real-ip");
    if (realIp && isValidIp(realIp)) {
        return realIp;
    }

    // Default fallback
    return "127.0.0.1";
}

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    readonly limit: number;
    /** Time window in seconds */
    readonly windowSeconds: number;
    /** Optional key prefix for namespacing different endpoints */
    readonly keyPrefix?: string;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
}

/**
 * Check if a request is rate limited
 *
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 *
 * @example
 * const result = checkRateLimit(request, { limit: 10, windowSeconds: 60 });
 * if (!result.success) {
 *     return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 * }
 */
export function checkRateLimit(request: NextRequest, config: RateLimitConfig): RateLimitResult {
    cleanupOldEntries();

    const ip = getClientIp(request);
    const key = config.keyPrefix ? `${config.keyPrefix}:${ip}` : ip;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    let entry = rateLimitStore.get(key);

    // If no entry exists or window has expired, create new entry
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, entry);

        return {
            success: true,
            limit: config.limit,
            remaining: config.limit - 1,
            resetTime: entry.resetTime,
        };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    const remaining = Math.max(0, config.limit - entry.count);
    const success = entry.count <= config.limit;

    return {
        success,
        limit: config.limit,
        remaining,
        resetTime: entry.resetTime,
    };
}

/**
 * Create a rate-limited response with appropriate headers
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse<RateLimitErrorResponse> {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
        {
            error: "Too many requests. Please try again later.",
            retryAfter,
        },
        {
            status: 429,
            headers: {
                "X-RateLimit-Limit": result.limit.toString(),
                "X-RateLimit-Remaining": result.remaining.toString(),
                "X-RateLimit-Reset": result.resetTime.toString(),
                "Retry-After": retryAfter.toString(),
            },
        }
    );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetTime.toString());
    return response;
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS: Readonly<{
    RSVP_VALIDATE: Readonly<RateLimitConfig>;
    RSVP_SUBMIT: Readonly<RateLimitConfig>;
    INVITATION: Readonly<RateLimitConfig>;
    GENERAL: Readonly<RateLimitConfig>;
}> = Object.freeze({
    // RSVP validation - strictest limit to prevent brute force code guessing
    RSVP_VALIDATE: Object.freeze({ limit: 5, windowSeconds: 60, keyPrefix: "rsvp-validate" }),

    // RSVP form submission - moderate limit
    RSVP_SUBMIT: Object.freeze({ limit: 20, windowSeconds: 60, keyPrefix: "rsvp-submit" }),

    // Invitation lookup - moderate limit
    INVITATION: Object.freeze({ limit: 30, windowSeconds: 60, keyPrefix: "invitation" }),

    // General API - more lenient
    GENERAL: Object.freeze({ limit: 60, windowSeconds: 60, keyPrefix: "general" }),
});

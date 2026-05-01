import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
    const { supabase, response } = createClient(request);

    // Refresh session if expired - required for Server Components
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    // Only log in development
    if (process.env.NODE_ENV === "development") {
        console.log(
            `[MIDDLEWARE] ${request.nextUrl.pathname} - Session: ${session ? "authenticated" : "not authenticated"}`
        );

        if (error) {
            console.log(`[MIDDLEWARE] Session error:`, error);
        }
    }

    // Check if the user is accessing dashboard routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
        // If no session and trying to access dashboard, redirect to login
        if (!session) {
            if (process.env.NODE_ENV === "development") {
                console.log(`[MIDDLEWARE] No session, redirecting to login`);
            }
            const redirectUrl = new URL("/login", request.url);
            redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
        }
    }

    // Seat finder is auth-gated until May 22nd 2026 (day before the wedding)
    const SEAT_FINDER_PUBLIC_DATE = new Date("2026-05-22T00:00:00Z");
    if (
        request.nextUrl.pathname.startsWith("/seat-finder") &&
        new Date() < SEAT_FINDER_PUBLIC_DATE &&
        !session
    ) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // If logged in and trying to access login page, redirect to dashboard
    if (request.nextUrl.pathname === "/login" && session) {
        if (process.env.NODE_ENV === "development") {
            console.log(`[MIDDLEWARE] Logged in user accessing login page, redirecting to dashboard`);
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/seat-finder/:path*", "/seat-finder"],
};

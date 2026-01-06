import { NextResponse } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Result of authentication check
 */
export type AuthResult =
    | { success: true; user: User }
    | { success: false; response: NextResponse };

/**
 * Requires authentication for an API route.
 * Returns the authenticated user or an unauthorized response.
 *
 * @param supabase - The Supabase client instance
 * @returns AuthResult with either the user or an error response
 *
 * @example
 * const auth = await requireAuth(supabase);
 * if (!auth.success) {
 *     return auth.response;
 * }
 * const user = auth.user;
 */
export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return { success: true, user };
}

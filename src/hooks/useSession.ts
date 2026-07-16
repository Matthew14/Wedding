"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Resolves whether an admin session is active. The session cookie is httpOnly
 * so the client can't inspect it directly; instead this asks /api/auth/me,
 * which returns 200 for a valid session and 401 otherwise.
 *
 * For authenticated admins, `masterCode` carries the bride & groom's master
 * invitation code from the same response (null until resolved or when unset),
 * so callers don't need a second /api/auth/me round-trip.
 *
 * `refresh` re-checks the session, e.g. after logging out.
 */
export function useSession(): {
    status: SessionStatus;
    masterCode: string | null;
    refresh: () => Promise<void>;
} {
    const [status, setStatus] = useState<SessionStatus>("loading");
    const [masterCode, setMasterCode] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json().catch(() => null);
                setMasterCode(data?.masterCode ?? null);
                setStatus("authenticated");
            } else {
                setMasterCode(null);
                setStatus("unauthenticated");
            }
        } catch {
            // Network blip, not a 401: don't drop an established session.
            // Only fail closed while the initial check is unresolved.
            setStatus((prev) => (prev === "authenticated" ? prev : "unauthenticated"));
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { status, masterCode, refresh };
}

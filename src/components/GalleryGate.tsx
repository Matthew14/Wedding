"use client";

import { useEffect, useState } from "react";
import { Center, Loader } from "@mantine/core";
import { notFound } from "next/navigation";
import { useGalleryFlag } from "@/hooks/useGalleryFlag";
import { useSession } from "@/hooks/useSession";

// How long to wait for the PostHog flag before treating it as off. Content
// blockers silently kill the PostHog SDK, leaving the flag in "loading"
// forever — without this cap the gallery showed an infinite spinner instead
// of a 404.
const FLAG_TIMEOUT_MS = 5000;

/**
 * Gates the gallery routes behind the `show-gallery` PostHog flag.
 *
 * - A logged-in admin always gets the gallery, whatever the flag says.
 * - While the flag (or the session check) resolves, a loader is shown — but
 *   only up to FLAG_TIMEOUT_MS, after which an unresolved flag counts as off.
 * - Flag off and not an admin → 404.
 */
export function GalleryGate({ children }: { children: React.ReactNode }) {
    const flagState = useGalleryFlag();
    const { status: sessionStatus } = useSession();
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setTimedOut(true), FLAG_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, []);

    if (sessionStatus === "authenticated" || flagState === "on") {
        return <>{children}</>;
    }

    // The timeout caps the session check too — a hung /api/auth/me would
    // otherwise reintroduce the exact infinite spinner this gate exists to
    // prevent. After it fires, anything unresolved counts as "not allowed".
    const stillResolving = flagState === "loading" || sessionStatus === "loading";
    if (stillResolving && !timedOut) {
        return (
            <Center py="xl">
                <Loader color="yellow" />
            </Center>
        );
    }

    notFound();
}

"use client";

import { Center, Loader } from "@mantine/core";
import { notFound } from "next/navigation";
import { useGalleryFlag } from "@/hooks/useGalleryFlag";

/**
 * Gates the gallery routes behind the `show-gallery` PostHog flag. While the
 * flag resolves it shows a loader; if the feature is off the route 404s.
 */
export function GalleryGate({ children }: { children: React.ReactNode }) {
    const state = useGalleryFlag();

    if (state === "loading") {
        return (
            <Center py="xl">
                <Loader color="yellow" />
            </Center>
        );
    }

    if (state === "off") {
        notFound();
    }

    return <>{children}</>;
}

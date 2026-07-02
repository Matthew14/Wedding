"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";

/** PostHog feature flag key controlling the photo gallery feature. */
export const GALLERY_FLAG = "show-gallery";

export type GalleryFlagState = "on" | "off" | "loading";

/**
 * Resolves whether the photo gallery feature is enabled, via the PostHog
 * `show-gallery` flag.
 *
 * - **Local development** (NODE_ENV !== "production"): always ON, so the gallery
 *   is usable locally regardless of PostHog.
 * - **Production**: gated by the flag and defaults to OFF — hidden unless the
 *   flag resolves to `true`. `"loading"` is returned while it resolves so callers
 *   can avoid flashing a 404; if PostHog isn't configured at all it stays OFF.
 */
export function useGalleryFlag(): GalleryFlagState {
    const enabled = useFeatureFlagEnabled(GALLERY_FLAG);
    if (process.env.NODE_ENV !== "production") return "on";
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return "off";
    if (enabled === undefined) return "loading";
    return enabled ? "on" : "off";
}

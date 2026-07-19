"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";

/** PostHog feature flag key controlling the gallery's category-cards UI. */
export const CATEGORY_CARDS_FLAG = "gallery-category-cards";

/**
 * Resolves whether the gallery shows the cover-photo category cards instead
 * of the category tabs, via the PostHog `gallery-category-cards` flag.
 *
 * - **Local development** (NODE_ENV !== "production"): always ON, so the
 *   cards are visible locally regardless of PostHog.
 * - **Production**: gated by the flag and defaults to OFF (the tab row) —
 *   including while the flag is still resolving, so the gallery never blocks
 *   on PostHog.
 */
export function useCategoryCardsFlag(): boolean {
    const enabled = useFeatureFlagEnabled(CATEGORY_CARDS_FLAG);
    if (process.env.NODE_ENV !== "production") return true;
    return enabled === true;
}

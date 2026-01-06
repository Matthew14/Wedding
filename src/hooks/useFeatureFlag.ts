import { usePostHog, useFeatureFlagEnabled, useFeatureFlagVariantKey } from 'posthog-js/react';

/**
 * Hook to check if a feature flag is enabled
 * Uses PostHog's built-in React hook which handles cleanup properly
 * @param flagKey - The key of the feature flag to check
 * @param defaultValue - The default value if the flag is not loaded yet
 * @returns The value of the feature flag
 */
export const useFeatureFlag = (flagKey: string, defaultValue: boolean = false): boolean => {
    const posthog = usePostHog();
    const isEnabled = useFeatureFlagEnabled(flagKey);

    // Return default if PostHog isn't available or flag hasn't loaded
    if (!posthog || isEnabled === undefined) {
        return defaultValue;
    }

    return isEnabled;
};

/**
 * Hook to get a multivariate feature flag value
 * Uses PostHog's built-in React hook which handles cleanup properly
 * @param flagKey - The key of the feature flag to check
 * @param defaultValue - The default value if the flag is not loaded yet
 * @returns The variant key of the feature flag (string or boolean)
 */
export const useFeatureFlagVariant = (
    flagKey: string,
    defaultValue?: string | boolean
): string | boolean | undefined => {
    const posthog = usePostHog();
    const variant = useFeatureFlagVariantKey(flagKey);

    // Return default if PostHog isn't available or flag hasn't loaded
    if (!posthog || variant === undefined) {
        return defaultValue;
    }

    return variant;
};

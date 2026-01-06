import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';

/**
 * Hook to check if a feature flag is enabled
 * @param flagKey - The key of the feature flag to check
 * @param defaultValue - The default value if the flag is not set
 * @returns The value of the feature flag
 */
export const useFeatureFlag = (flagKey: string, defaultValue: boolean = false): boolean => {
    const posthog = usePostHog();
    const [isEnabled, setIsEnabled] = useState(defaultValue);

    useEffect(() => {
        if (posthog) {
            // Get the initial value
            const flagValue = posthog.isFeatureEnabled(flagKey);
            setIsEnabled(flagValue ?? defaultValue);

            // Listen for feature flag updates
            const callback = () => {
                const newValue = posthog.isFeatureEnabled(flagKey);
                setIsEnabled(newValue ?? defaultValue);
            };

            posthog.onFeatureFlags(callback);

            // Cleanup is not needed as PostHog doesn't provide an unsubscribe method
            // The callback will simply not fire after unmount
        }
    }, [posthog, flagKey, defaultValue]);

    return isEnabled;
};

/**
 * Hook to get a multivariate feature flag value
 * @param flagKey - The key of the feature flag to check
 * @param defaultValue - The default value if the flag is not set
 * @returns The value of the feature flag
 */
export const useFeatureFlagVariant = (flagKey: string, defaultValue?: string): string | boolean | undefined => {
    const posthog = usePostHog();
    const [variant, setVariant] = useState<string | boolean | undefined>(defaultValue);

    useEffect(() => {
        if (posthog) {
            // Get the initial value
            const flagValue = posthog.getFeatureFlag(flagKey);
            setVariant(flagValue ?? defaultValue);

            // Listen for feature flag updates
            const callback = () => {
                const newValue = posthog.getFeatureFlag(flagKey);
                setVariant(newValue ?? defaultValue);
            };

            posthog.onFeatureFlags(callback);
        }
    }, [posthog, flagKey, defaultValue]);

    return variant;
};

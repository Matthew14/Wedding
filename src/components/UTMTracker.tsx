'use client';

import { useUTMTracking } from '@/hooks';

/**
 * Component to track UTM parameters and referrer
 * Should be placed in the root layout
 */
export function UTMTracker() {
    useUTMTracking();
    return null;
}

'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Only initialize in production or if explicitly enabled
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
                person_profiles: 'identified_only', // Don't create profiles for anonymous users
                capture_pageview: false, // We'll capture manually for better control
                capture_pageleave: true, // Track when users leave
                autocapture: false, // Disable auto-capture, we'll track explicitly
                session_recording: {
                    maskAllInputs: false, // Allow recording of form inputs
                    maskInputOptions: {
                        password: true, // Only mask password fields
                    },
                },
                loaded: (posthog) => {
                    if (process.env.NODE_ENV === 'development') {
                        posthog.debug(); // Enable debug mode in dev
                    }
                },
            });
        }
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}

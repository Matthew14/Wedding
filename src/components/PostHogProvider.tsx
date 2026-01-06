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
                autocapture: {
                    // Enable selective autocapture for rage/dead clicks
                    dom_event_allowlist: ['click'], // Only capture click events
                    url_allowlist: ['/rsvp'], // Only on RSVP pages
                    element_allowlist: ['button', 'a'], // Only buttons and links
                    css_selector_allowlist: ['.primary-cta-button', '.secondary-cta-button'], // Track specific buttons
                },
                capture_exceptions: true, // Enable automatic exception tracking
                capture_performance: true, // Enable automatic performance tracking
                enable_recording_console_log: true, // Capture console logs in session recordings
                session_recording: {
                    maskAllInputs: false, // Allow recording of form inputs
                    maskInputOptions: {
                        password: true, // Only mask password fields
                    },
                    recordCrossOriginIframes: false, // Don't record iframes for privacy
                },
                // Automatically detect rage clicks and dead clicks
                rageclick: true,
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

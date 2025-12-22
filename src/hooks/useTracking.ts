import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

export const useTracking = () => {
    const posthog = usePostHog();

    const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
        if (posthog) {
            posthog.capture(eventName, properties);
        }
    }, [posthog]);

    const trackPageView = useCallback((pageName: string, properties?: Record<string, unknown>) => {
        if (posthog) {
            posthog.capture('$pageview', {
                $current_url: window.location.href,
                page_name: pageName,
                ...properties,
            });
        }
    }, [posthog]);

    return {
        trackEvent,
        trackPageView,
    };
};

// Specific RSVP tracking events
export const RSVPEvents = {
    // Code entry flow
    CODE_ENTRY_VIEWED: 'rsvp_code_entry_viewed',
    CODE_ENTERED: 'rsvp_code_entered',
    CODE_VALIDATED: 'rsvp_code_validated',
    CODE_INVALID: 'rsvp_code_invalid',

    // Form flow
    FORM_VIEWED: 'rsvp_form_viewed',
    FORM_AMENDMENT: 'rsvp_form_amendment',
    FORM_LOAD_ERROR: 'rsvp_form_load_error',
    ACCEPTANCE_CHANGED: 'rsvp_acceptance_changed',
    INVITEE_TOGGLED: 'rsvp_invitee_toggled',
    VILLA_CHANGED: 'rsvp_villa_changed',
    DIETARY_FILLED: 'rsvp_dietary_filled',
    SONG_FILLED: 'rsvp_song_filled',
    TRAVEL_FILLED: 'rsvp_travel_filled',
    MESSAGE_FILLED: 'rsvp_message_filled',

    // Submission flow
    CONFIRMATION_OPENED: 'rsvp_confirmation_opened',
    CONFIRMATION_EDITED: 'rsvp_confirmation_edited',
    SUBMIT_ATTEMPT: 'rsvp_submit_attempt',
    SUBMIT_SUCCESS: 'rsvp_submit_success',
    SUBMIT_ERROR: 'rsvp_submit_error',

    // Success page
    SUCCESS_PAGE_VIEWED: 'rsvp_success_page_viewed',
    AMENDMENT_CLICKED: 'rsvp_amendment_clicked',
} as const;

// Site-wide tracking events
export const SiteEvents = {
    // Navigation
    NAV_CLICK: 'nav_click',
    EXTERNAL_LINK_CLICK: 'external_link_click',

    // Pages
    PAGE_404: 'page_404',

    // Errors
    API_ERROR: 'api_error',
    JS_ERROR: 'js_error',
} as const;

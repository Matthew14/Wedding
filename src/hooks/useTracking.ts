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
    FORM_STARTED: 'rsvp_form_started',
    ACCEPTANCE_CHANGED: 'rsvp_acceptance_changed',
    INVITEE_SELECTED: 'rsvp_invitee_selected',
    INVITEE_DESELECTED: 'rsvp_invitee_deselected',
    VILLA_SELECTED: 'rsvp_villa_selected',
    DIETARY_FILLED: 'rsvp_dietary_filled',
    SONG_REQUESTED: 'rsvp_song_requested',
    TRAVEL_PLANS_FILLED: 'rsvp_travel_plans_filled',
    MESSAGE_FILLED: 'rsvp_message_filled',

    // Submission flow
    SUBMIT_ATTEMPTED: 'rsvp_submit_attempted',
    SUBMIT_CONFIRMED: 'rsvp_submit_confirmed',
    SUBMIT_SUCCESS: 'rsvp_submit_success',
    SUBMIT_FAILED: 'rsvp_submit_failed',

    // Edit flow
    EDIT_VIEWED: 'rsvp_edit_viewed',
    EDIT_SUBMITTED: 'rsvp_edit_submitted',
} as const;

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

    const trackException = useCallback((error: Error, properties?: Record<string, unknown>) => {
        if (posthog) {
            posthog.captureException(error, properties);
        }
    }, [posthog]);

    const identifyUser = useCallback((userId: string, properties?: Record<string, unknown>) => {
        if (posthog) {
            posthog.identify(userId, properties);
        }
    }, [posthog]);

    const setUserProperties = useCallback((properties: Record<string, unknown>) => {
        if (posthog) {
            posthog.setPersonProperties(properties);
        }
    }, [posthog]);

    const trackPerformance = useCallback((
        eventName: string,
        startTime: number,
        properties?: Record<string, unknown>
    ) => {
        const duration = Math.round(performance.now() - startTime);
        if (posthog) {
            posthog.capture(eventName, {
                duration_ms: duration,
                ...properties,
            });
        }
        return duration;
    }, [posthog]);

    const trackAPICall = useCallback(async <T,>(
        apiCall: () => Promise<T>,
        eventName: string,
        properties?: Record<string, unknown>
    ): Promise<T> => {
        const startTime = performance.now();
        try {
            const result = await apiCall();
            const duration = Math.round(performance.now() - startTime);

            if (posthog) {
                posthog.capture(`${eventName}_success`, {
                    duration_ms: duration,
                    ...properties,
                });
            }

            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);

            if (posthog) {
                posthog.capture(`${eventName}_error`, {
                    duration_ms: duration,
                    error: error instanceof Error ? error.message : String(error),
                    ...properties,
                });
            }

            throw error;
        }
    }, [posthog]);

    const setGroup = useCallback((groupType: string, groupKey: string, properties?: Record<string, unknown>) => {
        if (posthog) {
            posthog.group(groupType, groupKey, properties);
        }
    }, [posthog]);

    return {
        trackEvent,
        trackPageView,
        trackException,
        identifyUser,
        setUserProperties,
        trackPerformance,
        trackAPICall,
        setGroup,
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

    // Calendar events
    CALENDAR_CLICKED: 'rsvp_calendar_clicked',
    CALENDAR_DOWNLOADED: 'rsvp_calendar_downloaded',
    CALENDAR_DOWNLOAD_ERROR: 'rsvp_calendar_download_error',
} as const;

// Invitation page tracking events
export const InvitationEvents = {
    PAGE_VIEWED: 'invitation_page_viewed',
    RSVP_CLICKED: 'invitation_rsvp_clicked',
    INVALID_LINK: 'invitation_invalid_link',
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

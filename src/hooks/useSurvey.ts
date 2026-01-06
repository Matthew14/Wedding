import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

/**
 * Hook to interact with PostHog surveys
 */
export const useSurvey = () => {
    const posthog = usePostHog();

    /**
     * Get surveys that should be shown to the current user
     * Note: PostHog surveys are shown automatically based on targeting rules
     * This method is a placeholder for accessing survey data
     */
    const getActiveSurveys = useCallback(() => {
        if (!posthog) return [];
        // PostHog manages surveys internally
        // This is a placeholder for custom survey logic
        return [];
    }, [posthog]);

    /**
     * Manually trigger a survey to be shown
     */
    const showSurvey = useCallback((surveyId: string) => {
        if (posthog) {
            // Surveys are shown automatically by PostHog based on targeting rules
            // This is a placeholder for any custom survey display logic
            if (process.env.NODE_ENV === 'development') {
                console.log(`Survey ${surveyId} should be shown`);
            }
        }
    }, [posthog]);

    /**
     * Dismiss a survey
     */
    const dismissSurvey = useCallback((surveyId: string) => {
        if (posthog) {
            posthog.capture('survey dismissed', {
                $survey_id: surveyId,
            });
        }
    }, [posthog]);

    /**
     * Submit survey response
     */
    const submitSurvey = useCallback((surveyId: string, response: Record<string, unknown>) => {
        if (posthog) {
            posthog.capture('survey sent', {
                $survey_id: surveyId,
                ...response,
            });
        }
    }, [posthog]);

    return {
        getActiveSurveys,
        showSurvey,
        dismissSurvey,
        submitSurvey,
    };
};

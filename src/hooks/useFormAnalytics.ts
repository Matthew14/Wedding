import { useEffect, useRef, useCallback } from 'react';
import { useTracking } from './useTracking';

interface FormAnalyticsOptions {
    formName: string;
    trackFieldFocus?: boolean;
    trackFieldBlur?: boolean;
    trackValidationErrors?: boolean;
}

export const useFormAnalytics = (options: FormAnalyticsOptions) => {
    const { formName, trackFieldFocus = true, trackFieldBlur = true, trackValidationErrors = true } = options;
    const { trackEvent } = useTracking();
    const formStartTimeRef = useRef<number | null>(null);
    const fieldFocusTimesRef = useRef<Record<string, number>>({});
    const fieldInteractionsRef = useRef<Set<string>>(new Set());

    // Start tracking when component mounts
    useEffect(() => {
        formStartTimeRef.current = performance.now();

        trackEvent('form_started', {
            form_name: formName,
        });

        return () => {
            // Track form abandonment if form was never submitted
            // Capture ref values in the cleanup to avoid stale closure issues
            const startTime = formStartTimeRef.current;
            const interactedFields = fieldInteractionsRef.current;

            if (startTime) {
                const timeSpent = Math.round(performance.now() - startTime);
                trackEvent('form_abandoned', {
                    form_name: formName,
                    time_spent_ms: timeSpent,
                    fields_interacted: Array.from(interactedFields),
                    interaction_count: interactedFields.size,
                });
            }
        };
        // trackEvent is stable from useTracking's useCallback, formName is primitive
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formName]);

    const trackFieldFocusEvent = useCallback((fieldName: string) => {
        if (!trackFieldFocus) return;

        fieldFocusTimesRef.current[fieldName] = performance.now();
        fieldInteractionsRef.current.add(fieldName);

        trackEvent('form_field_focused', {
            form_name: formName,
            field_name: fieldName,
        });
    }, [formName, trackFieldFocus, trackEvent]);

    const trackFieldBlurEvent = useCallback((fieldName: string, value?: string) => {
        if (!trackFieldBlur) return;

        const focusTime = fieldFocusTimesRef.current[fieldName];
        if (focusTime) {
            const timeSpent = Math.round(performance.now() - focusTime);
            trackEvent('form_field_blurred', {
                form_name: formName,
                field_name: fieldName,
                time_spent_ms: timeSpent,
                has_value: !!value,
                value_length: value?.length || 0,
            });
        }
    }, [formName, trackFieldBlur, trackEvent]);

    const trackValidationError = useCallback((fieldName: string, errorMessage: string) => {
        if (!trackValidationErrors) return;

        trackEvent('form_validation_error', {
            form_name: formName,
            field_name: fieldName,
            error_message: errorMessage,
        });
    }, [formName, trackValidationErrors, trackEvent]);

    const trackFormSubmission = useCallback((success: boolean, errorMessage?: string) => {
        if (formStartTimeRef.current) {
            const timeSpent = Math.round(performance.now() - formStartTimeRef.current);

            trackEvent(success ? 'form_submitted_success' : 'form_submitted_error', {
                form_name: formName,
                time_spent_ms: timeSpent,
                fields_interacted: Array.from(fieldInteractionsRef.current),
                interaction_count: fieldInteractionsRef.current.size,
                ...(errorMessage && { error_message: errorMessage }),
            });

            // Clear the start time to prevent abandonment tracking
            formStartTimeRef.current = null;
        }
    }, [formName, trackEvent]);

    return {
        trackFieldFocus: trackFieldFocusEvent,
        trackFieldBlur: trackFieldBlurEvent,
        trackValidationError,
        trackFormSubmission,
    };
};

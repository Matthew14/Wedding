"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RSVPFormData } from "@/types";
import { useTracking, RSVPEvents, useFormAnalytics } from "@/hooks";
import { fetchWithTimeout, isAbortError, FETCH_TIMEOUTS } from "@/utils/fetchWithTimeout";

interface UseRSVPSubmissionOptions {
    code: string;
}

interface UseRSVPSubmissionResult {
    submitting: boolean;
    success: boolean;
    error: string;
    handleSubmit: (values: RSVPFormData) => Promise<void>;
    clearError: () => void;
}

export function useRSVPSubmission({ code }: UseRSVPSubmissionOptions): UseRSVPSubmissionResult {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const { trackEvent, setUserProperties } = useTracking();
    const formAnalytics = useFormAnalytics({
        formName: 'rsvp_form',
        trackFieldFocus: false,
        trackFieldBlur: false,
    });

    const handleSubmit = async (values: RSVPFormData) => {
        setSubmitting(true);
        setError("");

        const attendingCount = values.invitees.filter(inv => inv.coming).length;
        trackEvent(RSVPEvents.SUBMIT_ATTEMPT, {
            code,
            accepted: values.accepted,
            attending_count: attendingCount,
            total_invitees: values.invitees.length,
            staying_villa: values.staying_villa === "yes",
            has_dietary: !!values.dietary_restrictions,
            has_song: !!values.song_request,
            has_travel: !!values.travel_plans,
            has_message: !!values.message,
        });

        try {
            const response = await fetchWithTimeout(
                `/api/rsvp/${code}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(values),
                },
                FETCH_TIMEOUTS.STANDARD
            );

            // Handle 207 Multi-Status as partial failure - some invitee updates failed
            if (response.status === 207) {
                const data = await response.json();
                const errorMessage = data.warning || "Some guest updates failed. Please try again.";
                setError(errorMessage);
                setSubmitting(false);
                trackEvent(RSVPEvents.SUBMIT_ERROR, {
                    code,
                    error: errorMessage,
                    partial_failure: true,
                    failed_invitee_count: data.failedInviteeIds?.length || 0,
                });
                formAnalytics.trackFormSubmission(false, errorMessage);
                return;
            }

            if (response.ok) {
                setSuccess(true);

                const attendingInvitees = values.invitees
                    .filter(inv => inv.coming)
                    .map(inv => inv.name)
                    .join(', ');

                setUserProperties({
                    accepted: values.accepted,
                    attending_count: attendingCount,
                    staying_villa: values.staying_villa === "yes",
                    has_dietary_restrictions: !!values.dietary_restrictions,
                    has_song_request: !!values.song_request,
                    has_travel_plans: !!values.travel_plans,
                    has_message: !!values.message,
                    attending_invitees: attendingInvitees || 'None',
                    last_updated: new Date().toISOString(),
                });

                trackEvent(RSVPEvents.SUBMIT_SUCCESS, {
                    code,
                    accepted: values.accepted,
                    attending_count: attendingCount,
                });

                formAnalytics.trackFormSubmission(true);

                setTimeout(() => {
                    router.push(`/rsvp/success?accepted=${values.accepted ? 'yes' : 'no'}&code=${code}`);
                }, 500);
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || "Failed to submit RSVP";
                setError(errorMessage);
                setSubmitting(false);
                trackEvent(RSVPEvents.SUBMIT_ERROR, {
                    code,
                    error: errorMessage,
                });

                formAnalytics.trackFormSubmission(false, errorMessage);
            }
        } catch (err) {
            const errorMessage = isAbortError(err)
                ? "Request timed out. Please check your connection and try again."
                : "Something went wrong. Please try again.";
            setError(errorMessage);
            setSubmitting(false);
            trackEvent(RSVPEvents.SUBMIT_ERROR, {
                code,
                error: isAbortError(err) ? 'timeout' : String(err),
            });

            formAnalytics.trackFormSubmission(false, isAbortError(err) ? 'timeout' : String(err));
        }
    };

    const clearError = () => setError("");

    return {
        submitting,
        success,
        error,
        handleSubmit,
        clearError,
    };
}

"use client";

import { Container, Text, Paper, Stack, Alert, Box, Button } from "@mantine/core";
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconX } from "@tabler/icons-react";
import { Navigation } from "@/components/Navigation";
import { RSVPFormData } from "@/types";
import { useRSVPForm, useTracking, RSVPEvents, useScrollDepth } from "@/hooks";
import { isRSVPClosed } from "@/utils/rsvpDeadline";
import { useRSVPData, useRSVPSubmission } from "./hooks";
import { RSVPFormHeader, RSVPFormFields, RSVPConfirmationModal } from "./components";

export default function RSVPFormPage() {
    const params = useParams();
    const router = useRouter();
    const code = params.code as string;

    const [showConfirmation, setShowConfirmation] = useState(false);
    const previousAcceptedRef = useRef<boolean | null>(null);
    const disabled = isRSVPClosed();

    const form = useRSVPForm();
    const { trackEvent } = useTracking();
    useScrollDepth('rsvp_form');

    const {
        loading,
        error: loadError,
        guestNames,
        villaOffered,
        infoText,
        originalValues,
        isInitialLoad,
    } = useRSVPData({ code, form });

    const {
        submitting,
        success,
        error: submitError,
        handleSubmit,
    } = useRSVPSubmission({ code });

    const error = loadError || submitError;

    // Handle invitee checkbox changes
    const handleInviteeChange = (inviteeId: number, coming: boolean) => {
        const updatedInvitees = form.values.invitees.map(inv =>
            inv.id === inviteeId ? { ...inv, coming } : inv
        );
        form.setFieldValue("invitees", updatedInvitees);
        form.validateField("invitees");

        const attendingCount = updatedInvitees.filter(inv => inv.coming).length;
        trackEvent(RSVPEvents.INVITEE_TOGGLED, {
            code,
            invitee_id: inviteeId,
            coming,
            total_attending: attendingCount,
        });
    };

    // Auto-update invitees when acceptance changes (user-initiated only)
    useEffect(() => {
        if (isInitialLoad || form.values.invitees.length === 0) return;

        const currentAccepted = form.values.accepted;
        const previousAccepted = previousAcceptedRef.current;

        // First run after load - just record the state, don't modify invitees
        // This preserves amendment data where some guests may not be coming
        if (previousAccepted === null) {
            previousAcceptedRef.current = currentAccepted;
            return;
        }

        if (currentAccepted === previousAccepted) return;

        previousAcceptedRef.current = currentAccepted;

        if (!currentAccepted) {
            // Uncheck all when "No" is selected
            form.setFieldValue("invitees",
                form.values.invitees.map(inv => ({ ...inv, coming: false }))
            );
        } else if (!originalValues) {
            // Only check all when "Yes" is selected for NEW RSVPs (not amendments)
            form.setFieldValue("invitees",
                form.values.invitees.map(inv => ({ ...inv, coming: true }))
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.accepted, isInitialLoad]);

    // Check if form has changes from original values
    const hasChanges = useMemo(() => {
        if (!originalValues) return true;

        const normalizeEmpty = (value: string | null | undefined): string => value || "";

        const inviteesAreEqual = (a: RSVPFormData['invitees'], b: RSVPFormData['invitees']) => {
            if (a.length !== b.length) return false;
            return a.every((invitee) => {
                const other = b.find(inv => inv.id === invitee.id);
                return other && invitee.coming === other.coming;
            });
        };

        return (
            form.values.accepted !== originalValues.accepted ||
            !inviteesAreEqual(form.values.invitees, originalValues.invitees) ||
            form.values.staying_villa !== originalValues.staying_villa ||
            normalizeEmpty(form.values.dietary_restrictions) !== normalizeEmpty(originalValues.dietary_restrictions) ||
            normalizeEmpty(form.values.song_request) !== normalizeEmpty(originalValues.song_request) ||
            normalizeEmpty(form.values.travel_plans) !== normalizeEmpty(originalValues.travel_plans) ||
            normalizeEmpty(form.values.message) !== normalizeEmpty(originalValues.message)
        );
    }, [form.values, originalValues]);

    if (loading) {
        return (
            <Container size="sm" py="xl">
                <Stack gap="xl" align="center">
                    <Text>Loading RSVP form...</Text>
                </Stack>
            </Container>
        );
    }

    if (error && !success) {
        return (
            <Container size="sm" py="xl">
                <Stack gap="xl" align="center">
                    <Alert icon={<IconX size={16} />} title="Error" color="red">
                        {error}
                    </Alert>
                    <Button onClick={() => router.push("/rsvp")} variant="outline">
                        Back to RSVP Code Entry
                    </Button>
                </Stack>
            </Container>
        );
    }

    const handleFormSubmit = () => {
        setShowConfirmation(true);
        trackEvent(RSVPEvents.CONFIRMATION_OPENED, {
            code,
            accepted: form.values.accepted,
        });
    };

    const handleConfirmSubmit = () => {
        setShowConfirmation(false);
        handleSubmit(form.values);
    };

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="md" py="xl" className="fade-in">
                        <Stack gap="xl">
                            <RSVPFormHeader guestNames={guestNames} infoText={infoText} disabled={disabled} />

                            <Paper className="elegant-card" radius="lg" p="xl">
                                <form
                                    onSubmit={form.onSubmit(handleFormSubmit)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target !== e.currentTarget) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    <RSVPFormFields
                                        form={form}
                                        code={code}
                                        villaOffered={villaOffered}
                                        hasChanges={hasChanges}
                                        submitting={submitting}
                                        originalValues={originalValues}
                                        onInviteeChange={handleInviteeChange}
                                        disabled={disabled}
                                    />
                                </form>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>

            <RSVPConfirmationModal
                opened={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                onConfirm={handleConfirmSubmit}
                values={form.values}
                code={code}
                submitting={submitting}
                villaOffered={villaOffered}
            />
        </>
    );
}

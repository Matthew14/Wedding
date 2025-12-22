"use client";

import {
    Container,
    Title,
    Text,
    Paper,
    Checkbox,
    Textarea,
    Button,
    Stack,
    Alert,
    Box,
    Divider,
    Radio,
    Group,
    Modal,
    TextInput,
} from "@mantine/core";
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    IconX,
    IconUsers,
    IconBed,
    IconChefHat,
    IconMusic,
    IconPlane,
    IconMessage,
    IconBook,
} from "@tabler/icons-react";
import { Navigation } from "@/components/Navigation";
import { RSVPFormData, Invitee, DatabaseRSVPResponse } from "@/types";
import { useRSVPForm, useTracking, RSVPEvents } from "@/hooks";

export default function RSVPFormPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [infoText, setInfoText] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [originalValues, setOriginalValues] = useState<RSVPFormData | null>(null);
    const previousAcceptedRef = useRef<boolean | null>(null);

    const form = useRSVPForm();
    const { trackEvent } = useTracking();

    useEffect(() => {
        const fetchRSVPData = async () => {
            try {
                const code = params.code as string;

                // Fetch RSVP data and invitees
                const response = await fetch(`/api/rsvp/${code}`);

                if (response.ok) {
                    const data: DatabaseRSVPResponse = await response.json();
                    const isReturningUser = !!(data && data.updatedAt);
                    const inviteeCount = data.invitees?.length || 0;

                    // Track form view (page view tracked by PageViewTracker component)
                    trackEvent(RSVPEvents.FORM_VIEWED, {
                        code,
                        invitee_count: inviteeCount,
                        is_amendment: isReturningUser,
                    });

                    // If there's existing RSVP data and it was updated, pre-populate the form
                    if (isReturningUser && data.updatedAt) {
                        console.log('data', data);
                        const formattedDate = new Date(data.updatedAt).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        setInfoText("You're amending your RSVP, last updated on " + formattedDate);

                        // Map invitees with their existing responses
                        const inviteesWithResponses = data.invitees?.map((inv: Invitee & { coming?: boolean }) => ({
                            id: inv.id,
                            name: `${inv.first_name} ${inv.last_name}`,
                            coming: inv.coming ?? false,
                        })) || [];

                        const loadedValues = {
                            accepted: data.accepted,
                            invitees: inviteesWithResponses,
                            staying_villa: data.stayingVilla ? "yes" : "no",
                            dietary_restrictions: data.dietaryRestrictions,
                            song_request: data.songRequest,
                            travel_plans: data.travelPlans,
                            message: data.message,
                        };

                        form.setValues(loadedValues);
                        // Store original values for comparison
                        setOriginalValues(loadedValues);

                        // Track amendment details
                        trackEvent(RSVPEvents.FORM_AMENDMENT, {
                            code,
                            previous_acceptance: data.accepted,
                            has_dietary: !!data.dietaryRestrictions,
                            has_song: !!data.songRequest,
                            has_travel: !!data.travelPlans,
                            has_message: !!data.message,
                        });
                    } else {
                        // Set default invitees only if no existing data
                        // Initialize as unchecked - users must manually select who's coming
                        form.setFieldValue("invitees",
                            data.invitees?.map((inv: Invitee) => ({
                                id: inv.id,
                                name: `${inv.first_name} ${inv.last_name}`,
                                coming: false,
                            })) || []
                        );
                    }

                    // Mark initial load as complete
                    setIsInitialLoad(false);
                } else {
                    setError("Failed to load RSVP data");
                    trackEvent(RSVPEvents.FORM_LOAD_ERROR, {
                        code: params.code as string,
                        error: 'Failed to load',
                    });
                }
            } catch (err) {
                setError("Something went wrong while loading the form");
                trackEvent(RSVPEvents.FORM_LOAD_ERROR, {
                    code: params.code as string,
                    error: String(err),
                });
            } finally {
                setLoading(false);
            }
        };

        if (params.code) {
            fetchRSVPData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.code]);

    const handleSubmit = async (values: RSVPFormData) => {
        setSubmitting(true);
        setError("");
        console.log(values);

        // Track submission attempt
        const attendingCount = values.invitees.filter(inv => inv.coming).length;
        trackEvent(RSVPEvents.SUBMIT_ATTEMPT, {
            code: params.code as string,
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
            const code = params.code as string;
            const response = await fetch(`/api/rsvp/${code}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                setSuccess(true);
                trackEvent(RSVPEvents.SUBMIT_SUCCESS, {
                    code,
                    accepted: values.accepted,
                    attending_count: attendingCount,
                });
                setTimeout(() => {
                    router.push(`/rsvp/success?accepted=${values.accepted ? 'yes' : 'no'}&code=${params.code}`);
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
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setSubmitting(false);
            trackEvent(RSVPEvents.SUBMIT_ERROR, {
                code: params.code as string,
                error: String(err),
            });
        }
    };

    const handleInviteeChange = (inviteeId: number, coming: boolean) => {
        const updatedInvitees = form.values.invitees.map(inv =>
            inv.id === inviteeId ? { ...inv, coming } : inv
        );
        form.setFieldValue("invitees", updatedInvitees);
        // Validate immediately to show error message when no invitees are selected
        form.validateField("invitees");

        // Track invitee toggle
        const attendingCount = updatedInvitees.filter(inv => inv.coming).length;
        trackEvent(RSVPEvents.INVITEE_TOGGLED, {
            code: params.code as string,
            invitee_id: inviteeId,
            coming,
            total_attending: attendingCount,
        });
    };

    // Effect to automatically check/uncheck all invitees based on acceptance status
    // This should only run when the user actively changes the acceptance radio button,
    // not when we're loading initial/amendment data or when invitees are manually toggled
    useEffect(() => {
        // Skip if still loading initial data or no invitees
        if (isInitialLoad || form.values.invitees.length === 0) {
            return;
        }

        // Check if acceptance value actually changed from previous value
        const currentAccepted = form.values.accepted;
        const previousAccepted = previousAcceptedRef.current;

        // If this is the first time setting the value after load, just store it without acting
        if (previousAccepted === null) {
            previousAcceptedRef.current = currentAccepted;
            return;
        }

        // Only proceed if acceptance value actually changed
        if (currentAccepted === previousAccepted) {
            return;
        }

        // Update the ref for next comparison
        previousAcceptedRef.current = currentAccepted;

        // User actively toggled the acceptance radio button
        if (!currentAccepted) {
            // Changed to declining - uncheck all invitees
            form.setFieldValue("invitees",
                form.values.invitees.map(inv => ({ ...inv, coming: false }))
            );
        }
        // Note: When changing from "No" to "Yes", we DON'T auto-check invitees
        // Let the user manually select who's coming
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.accepted, isInitialLoad]);

    // Check if form has changes from original values
    const hasChanges = useMemo(() => {
        if (!originalValues) return true; // If no original values, allow submission (new RSVP)

        // Helper to normalize empty values (null, undefined, and "" are all treated as empty)
        const normalizeEmpty = (value: string | null | undefined): string => {
            return value || "";
        };

        // Compare invitees arrays for deep equality
        const inviteesAreEqual = (a: typeof form.values.invitees, b: typeof form.values.invitees) => {
            if (a.length !== b.length) return false;
            return a.every((invitee) => {
                const otherInvitee = b.find(inv => inv.id === invitee.id);
                return otherInvitee && invitee.coming === otherInvitee.coming;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="md" py="xl" className="fade-in">
                        <Stack gap="xl">
                            {/* Header */}
                            <Box style={{ textAlign: "center", marginBottom: "1rem" }}>
                                <Title
                                    order={1}
                                    style={{
                                        fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
                                        fontWeight: 400,
                                        color: "var(--text-primary)",
                                        marginBottom: "0",
                                        fontFamily: "var(--font-cormorant), serif",
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    Répondez s&apos;il vous plaît
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                {infoText ? (
                                    <Text size="lg" style={{ color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 600, margin: "0 auto" }} pb="md">
                                        {infoText}
                                    </Text>
                                ) : (
                                <Text size="lg" style={{ color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 600, margin: "0 auto" }}>
                                    Let us know if you&apos;re coming to our wedding! Once you&apos;ve filled out this
                                    form, you will still be able to amend your details here up until the 1st of
                                    December. After that please get in touch if something changes.
                                </Text>
                                )}
                            </Box>

                            {/* RSVP Form */}
                            <Paper className="elegant-card" radius="lg" p="xl">
                                <form onSubmit={form.onSubmit(() => {
                                    setShowConfirmation(true);
                                    trackEvent(RSVPEvents.CONFIRMATION_OPENED, {
                                        code: params.code as string,
                                        accepted: form.values.accepted,
                                    });
                                })} onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target !== e.currentTarget) {
                                        e.preventDefault();
                                    }
                                }}>
                                    <Stack gap="xl">
                                        {/* Are you joining us? */}
                                        <Box mb="xl">
                                            <Group gap="sm" mb="md">
                                                <IconBook size={20} color="var(--gold-dark)" />
                                                <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                    Are you joining us?
                                                </Text>
                                                <Text span style={{ color: "#e53e3e" }}>
                                                    *
                                                </Text>
                                            </Group>
                                            <Radio.Group
                                                value={form.values.accepted ? "yes" : "no"}
                                                onChange={(value) => {
                                                    const isAccepted = value === "yes";
                                                    form.setFieldValue("accepted", isAccepted);
                                                    // Validate invitees when accepting to show error
                                                    // if no guests are selected
                                                    if (isAccepted) {
                                                        form.validateField("invitees");
                                                    } else {
                                                        // Clear invitees error when declining
                                                        form.clearFieldError("invitees");
                                                    }

                                                    // Track acceptance change
                                                    trackEvent(RSVPEvents.ACCEPTANCE_CHANGED, {
                                                        code: params.code as string,
                                                        accepted: isAccepted,
                                                    });
                                                }}
                                                required
                                            >
                                                <Group gap="lg">
                                                    <Radio value="yes" label="Yes" size="md" />
                                                    <Radio value="no" label="No" size="md" />
                                                </Group>
                                            </Radio.Group>
                                        </Box>

                                        {/* Form fields - Only visible when 'coming' is Yes */}
                                        {form.values.accepted && (
                                            <>
                                                {/* 
                                                    Is everyone coming? - Only visible when there are multiple invitees 
                                                */}
                                                {form.values.invitees.length > 1 && (
                                                    <Box mb="xl">
                                                        <Group gap="sm" mb="md">
                                                            <IconUsers size={20} color="var(--gold-dark)" />
                                                            <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                                Is everyone coming?
                                                            </Text>
                                                            <Text span style={{ color: "#e53e3e" }}>
                                                                *
                                                            </Text>
                                                        </Group>
                                                        <Stack gap="sm">
                                                            {form.values.invitees.map(invitee => (
                                                                <Checkbox
                                                                    key={invitee.id}
                                                                    label={invitee.name}
                                                                    checked={invitee.coming}
                                                                    onChange={(event) => {
                                                                        handleInviteeChange(
                                                                            invitee.id,
                                                                            event.currentTarget.checked
                                                                        );
                                                                    }}
                                                                    size="md"
                                                                />
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {/* Invitees validation error - shown regardless of invitee count */}
                                                {form.errors.invitees && (
                                                    <Text size="sm" style={{ color: "#e53e3e", marginBottom: "1rem" }}>
                                                        {form.errors.invitees}
                                                    </Text>
                                                )}

                                                {/* Will you be staying with us at Gran Villa Rosa? */}
                                                <Box mb="xl">
                                                    <Group gap="sm" mb="md">
                                                        <IconBed size={20} color="var(--gold-dark)" />
                                                        <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                            Will you be staying with us at Gran Villa Rosa?
                                                        </Text>
                                                        <Text span style={{ color: "#e53e3e" }}>
                                                            *
                                                        </Text>
                                                    </Group>
                                                    <Text
                                                        size="sm"
                                                        style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}
                                                    >
                                                        We&apos;ve reserved a complimentary room in the venue for you
                                                        for both nights. If you&apos;d prefer to arrange your own
                                                        accommodation, please let us know.
                                                    </Text>
                                                    <Radio.Group
                                                        {...form.getInputProps("staying_villa")}
                                                        onChange={(value) => {
                                                            form.setFieldValue("staying_villa", value);
                                                            trackEvent(RSVPEvents.VILLA_CHANGED, {
                                                                code: params.code as string,
                                                                staying: value === "yes",
                                                            });
                                                        }}
                                                        required
                                                    >
                                                        <Group gap="lg">
                                                            <Radio value="yes" label="Yes" size="md" />
                                                            <Radio value="no" label="No" size="md" />
                                                        </Group>
                                                    </Radio.Group>
                                                </Box>

                                                {/* Dietary restrictions */}
                                                <Box mb="xl">
                                                    <Group gap="sm" mb="md">
                                                        <IconChefHat size={20} color="var(--gold-dark)" />
                                                        <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                            Do you have any allergies or specific dietary requests?
                                                        </Text>
                                                    </Group>
                                                    <Textarea
                                                        placeholder="Please let us know about any dietary requirements..."
                                                        {...form.getInputProps("dietary_restrictions")}
                                                        onBlur={(e) => {
                                                            if (e.target.value.trim()) {
                                                                trackEvent(RSVPEvents.DIETARY_FILLED, {
                                                                    code: params.code as string,
                                                                    length: e.target.value.length,
                                                                });
                                                            }
                                                        }}
                                                        minRows={3}
                                                        size="md"
                                                    />
                                                </Box>

                                                {/* Song request */}
                                                <Box mb="xl">
                                                    <Group gap="sm" mb="md">
                                                        <IconMusic size={20} color="var(--gold-dark)" />
                                                        <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                            Got a song request for the wedding playlist? Add it here!
                                                        </Text>
                                                    </Group>
                                                    <TextInput
                                                        placeholder="What song would you like to hear at our wedding?"
                                                        {...form.getInputProps("song_request")}
                                                        onBlur={(e) => {
                                                            if (e.target.value.trim()) {
                                                                trackEvent(RSVPEvents.SONG_FILLED, {
                                                                    code: params.code as string,
                                                                    length: e.target.value.length,
                                                                });
                                                            }
                                                        }}
                                                        size="md"
                                                    />
                                                </Box>

                                                {/* Travel plans */}
                                                <Box mb="xl">
                                                    <Group gap="sm" mb="md">
                                                        <IconPlane size={20} color="var(--gold-dark)" />
                                                        <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                            Please add any travel plans so we can help with transfers
                                                        </Text>
                                                    </Group>
                                                    <Textarea
                                                        placeholder="Flight number, day of travel etc."
                                                        {...form.getInputProps("travel_plans")}
                                                        onBlur={(e) => {
                                                            if (e.target.value.trim()) {
                                                                trackEvent(RSVPEvents.TRAVEL_FILLED, {
                                                                    code: params.code as string,
                                                                    length: e.target.value.length,
                                                                });
                                                            }
                                                        }}
                                                        minRows={3}
                                                        size="md"
                                                    />
                                                </Box>
                                            </>
                                        )}

                                        {/* Additional message */}
                                        <Box mb="xl">
                                            <Group gap="sm" mb="md">
                                                <IconMessage size={20} color="var(--gold-dark)" />
                                                <Text size="lg" fw={500} style={{ color: "var(--text-primary)" }}>
                                                    Anything else you&apos;d like us to know?
                                                </Text>
                                            </Group>
                                            <Textarea
                                                placeholder="Any other information you'd like to share..."
                                                {...form.getInputProps("message")}
                                                onBlur={(e) => {
                                                    if (e.target.value.trim()) {
                                                        trackEvent(RSVPEvents.MESSAGE_FILLED, {
                                                            code: params.code as string,
                                                            length: e.target.value.length,
                                                        });
                                                    }
                                                }}
                                                minRows={4}
                                                size="md"
                                            />
                                        </Box>

                                        <Divider style={{ borderColor: "rgba(139, 115, 85, 0.2)" }} />

                                        {/* Submit Button */}
                                        <Button
                                            type="submit"
                                            size="lg"
                                            loading={submitting}
                                            disabled={submitting || !hasChanges}
                                            className="primary-cta-button"
                                            style={{
                                                backgroundColor: "var(--gold)",
                                                color: "#ffffff",
                                                borderRadius: "8px",
                                                fontWeight: 500,
                                                letterSpacing: "0.02em",
                                            }}
                                            fullWidth
                                        >
                                            Submit RSVP
                                        </Button>
                                        {!hasChanges && originalValues && (
                                            <Text
                                                size="sm"
                                                style={{
                                                    color: "var(--text-secondary)",
                                                    textAlign: "center",
                                                    fontStyle: "italic",
                                                    marginTop: "-0.5rem"
                                                }}
                                            >
                                                No changes to submit
                                            </Text>
                                        )}
                                    </Stack>
                                </form>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>

            {/* Confirmation Modal */}
            <Modal
                opened={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                title={
                    <Box style={{ textAlign: "center", width: "100%" }}>
                        <Text
                            fw={400}
                            size="xl"
                            style={{
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-playfair), serif",
                                fontSize: "1.75rem",
                                letterSpacing: "0.02em"
                            }}
                        >
                            Confirm Your RSVP
                        </Text>
                    </Box>
                }
                size="lg"
                centered
                radius="lg"
                padding="xl"
                styles={{
                    content: {
                        backgroundColor: "rgba(255, 255, 255, 0.98)",
                        border: "1px solid rgba(139, 115, 85, 0.15)",
                        boxShadow: "0 20px 60px rgba(139, 115, 85, 0.2)",
                    },
                    header: {
                        backgroundColor: "transparent",
                        borderBottom: "none",
                        paddingBottom: 0,
                        textAlign: "center",
                    },
                    title: {
                        width: "100%",
                        textAlign: "center",
                    },
                    body: {
                        paddingTop: "1rem",
                    },
                }}
            >
                <Stack gap="lg">
                    <div className="decorative-divider" style={{ margin: "0 auto 1rem" }}></div>

                    <Text
                        size="sm"
                        style={{
                            color: "var(--text-secondary)",
                            textAlign: "center",
                            lineHeight: 1.7
                        }}
                    >
                        Please review your RSVP details before submitting:
                    </Text>

                    <Paper
                        p="lg"
                        radius="md"
                        style={{
                            backgroundColor: "rgba(250, 248, 245, 0.5)",
                            border: "1px solid rgba(139, 115, 85, 0.1)"
                        }}
                    >
                        <Stack gap="md">
                            <Box>
                                <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                    Attendance
                                </Text>
                                <Text
                                    fw={500}
                                    c={form.values.accepted ? "green" : "red"}
                                    style={{ fontSize: "0.95rem" }}
                                >
                                    {form.values.accepted ? "✓ Yes, I'm coming!" : "✗ No, I can't make it"}
                                </Text>
                            </Box>

                        {form.values.accepted && (
                            <>
                                {form.values.invitees.length > 1 && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.5rem" }}>
                                            Guest Attendance
                                        </Text>
                                        <Stack gap="xs">
                                            {form.values.invitees.map((invitee) => (
                                                <Text
                                                    key={invitee.id}
                                                    c={invitee.coming ? "green" : "red"}
                                                    fw={500}
                                                    style={{ fontSize: "0.9rem", paddingLeft: "0.5rem" }}
                                                >
                                                    {invitee.coming ? "✓" : "✗"} {invitee.name}
                                                </Text>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                <Box>
                                    <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                        Accommodation
                                    </Text>
                                    <Text style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                                        {form.values.staying_villa === "yes"
                                            ? "✓ Staying at Gran Villa Rosa"
                                            : "Arranging own accommodation"
                                        }
                                    </Text>
                                </Box>

                                {form.values.dietary_restrictions && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Dietary Requirements
                                        </Text>
                                        <Text style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {form.values.dietary_restrictions}
                                        </Text>
                                    </Box>
                                )}

                                {form.values.song_request && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Song Request
                                        </Text>
                                        <Text style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {form.values.song_request}
                                        </Text>
                                    </Box>
                                )}

                                {form.values.travel_plans && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Travel Plans
                                        </Text>
                                        <Text style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {form.values.travel_plans}
                                        </Text>
                                    </Box>
                                )}
                            </>
                        )}

                        {form.values.message && (
                            <Box>
                                <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                    Additional Message
                                </Text>
                                <Text style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                    {form.values.message}
                                </Text>
                            </Box>
                        )}
                        </Stack>
                    </Paper>

                    <Group justify="space-between" mt="lg" gap="md">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmation(false);
                                trackEvent(RSVPEvents.CONFIRMATION_EDITED, {
                                    code: params.code as string,
                                });
                            }}
                            className="secondary-cta-button"
                            size="md"
                            style={{
                                borderColor: "var(--gold-dark)",
                                color: "var(--gold-dark)",
                                fontWeight: 500,
                                borderWidth: "2px",
                                borderRadius: "8px",
                                flex: 1,
                            }}
                        >
                            Go Back & Edit
                        </Button>
                        <Button
                            onClick={() => {
                                setShowConfirmation(false);
                                handleSubmit(form.values);
                            }}
                            className="primary-cta-button"
                            size="md"
                            style={{
                                backgroundColor: "var(--gold)",
                                color: "#ffffff",
                                fontWeight: 500,
                                borderRadius: "8px",
                                flex: 1,
                            }}
                            loading={submitting}
                        >
                            Confirm & Submit
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}

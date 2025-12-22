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
    List,
    TextInput,
} from "@mantine/core";
import { useState, useEffect } from "react";
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

    const form = useRSVPForm();
    const { trackEvent, trackPageView } = useTracking();

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

                    // Track form view
                    trackPageView('RSVP Form');
                    trackEvent(RSVPEvents.FORM_VIEWED, {
                        code,
                        invitee_count: inviteeCount,
                        is_amendment: isReturningUser,
                    });

                    // If there's existing RSVP data and it was updated, pre-populate the form
                    if (isReturningUser) {
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
                        const inviteesWithResponses = data.invitees?.map((inv: Invitee) => ({
                            id: inv.id,
                            name: `${inv.first_name} ${inv.last_name}`,
                            coming: data?.inviteeResponses?.[inv.id] ?? true,
                        })) || [];

                        form.setValues({
                            accepted: data.accepted,
                            invitees: inviteesWithResponses,
                            staying_villa: data.stayingVilla ? "yes" : "no",
                            dietary_restrictions: data.dietaryRestrictions,
                            song_request: data.songRequest,
                            travel_plans: data.travelPlans,
                            message: data.message,
                        });

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
                        form.setFieldValue("invitees",
                            data.invitees?.map((inv: Invitee) => ({
                                id: inv.id,
                                name: `${inv.first_name} ${inv.last_name}`,
                                coming: true,
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

    // Effect to automatically check/uncheck all invitees based on coming status
    useEffect(() => {
        // Only run this effect after initial load is complete to avoid overriding pre-populated data
        if (!isInitialLoad && form.values.invitees.length > 0) {
            if (!form.values.accepted) {
                // Uncheck all invitees when not coming
                form.setFieldValue("invitees",
                    form.values.invitees.map(inv => ({ ...inv, coming: false }))
                );
            } else {
                // Check all invitees when coming (as a default)
                form.setFieldValue("invitees",
                    form.values.invitees.map(inv => ({ ...inv, coming: true }))
                );
                // Clear any stale validation error after auto-selecting all invitees
                // This handles the race condition where onChange validates before useEffect runs
                form.clearFieldError("invitees");
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.accepted, isInitialLoad]);

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
                    <Container size="md" py="xl">
                        <Stack gap="xl">
                            {/* Header */}
                            <Box style={{ textAlign: "center" }}>
                                <Title
                                    order={1}
                                    style={{
                                        fontSize: "clamp(2rem, 6vw, 3rem)",
                                        fontWeight: 300,
                                        color: "#8b7355",
                                        marginBottom: "1rem",
                                        fontFamily: "cursive",
                                        fontStyle: "italic",
                                    }}
                                >
                                    Répondez s&apos;il vous plaît
                                </Title>
                                {infoText ? (
                                    <Text size="lg" style={{ color: "#6c757d" }} pb="md">
                                        {infoText}
                                    </Text>
                                ) : (
                                <Text size="lg" style={{ color: "#6c757d" }}>
                                    Let us know if you&apos;re coming to our wedding! Once you&apos;ve filled out this
                                    form, you will still be able to amend your details here up until the 1st of
                                    December. After that please get in touch if something changes.
                                </Text>
                                )}
                            </Box>

                            {/* RSVP Form */}
                            <Paper shadow="md" radius="lg" p="xl">
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
                                                <IconBook size={20} color="#8b7355" />
                                                <Text size="lg" fw={500}>
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
                                                            <IconUsers size={20} color="#8b7355" />
                                                            <Text size="lg" fw={500}>
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
                                                        <IconBed size={20} color="#8b7355" />
                                                        <Text size="lg" fw={500}>
                                                            Will you be staying with us at Gran Villa Rosa?
                                                        </Text>
                                                        <Text span style={{ color: "#e53e3e" }}>
                                                            *
                                                        </Text>
                                                    </Group>
                                                    <Text
                                                        size="sm"
                                                        style={{ color: "#6c757d", marginBottom: "1rem" }}
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
                                                        <IconChefHat size={20} color="#8b7355" />
                                                        <Text size="lg" fw={500}>
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
                                                        <IconMusic size={20} color="#8b7355" />
                                                        <Text size="lg" fw={500}>
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
                                                        <IconPlane size={20} color="#8b7355" />
                                                        <Text size="lg" fw={500}>
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
                                                <IconMessage size={20} color="#8b7355" />
                                                <Text size="lg" fw={500}>
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

                                        <Divider />

                                        {/* Submit Button */}
                                        <Button type="submit" size="lg" loading={submitting} disabled={submitting} color="#8b7355" fullWidth>
                                            Submit RSVP
                                        </Button>
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
                title="Confirm Your RSVP"
                size="lg"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Please review your RSVP details before submitting:
                    </Text>

                    <List size="sm" spacing="xs">
                        <List.Item>
                            <Text fw={500}>Attendance:</Text>
                            <Text c={form.values.accepted ? "green" : "red"}>
                                {form.values.accepted ? "Yes, I'm coming!" : "No, I can't make it"}
                            </Text>
                        </List.Item>

                        {form.values.accepted && (
                            <>
                                {form.values.invitees.length > 1 && (
                                    <List.Item>
                                        <Text fw={500}>Invitee Attendance:</Text>
                                        {form.values.invitees.map((invitee) => (
                                            <Text key={invitee.id} c={invitee.coming ? "green" : "red"}>
                                                • {invitee.name}: {invitee.coming ? "Coming" : "Not coming"}
                                            </Text>
                                        ))}
                                    </List.Item>
                                )}

                                <List.Item>
                                    <Text fw={500}>Accommodation:</Text>
                                    <Text>
                                        {form.values.staying_villa === "yes" 
                                            ? "Yes, staying at Gran Villa Rosa" 
                                            : "No, arranging own accommodation"
                                        }
                                    </Text>
                                </List.Item>

                                {form.values.dietary_restrictions && (
                                    <List.Item>
                                        <Text fw={500}>Dietary Restrictions:</Text>
                                        <Text>{form.values.dietary_restrictions}</Text>
                                    </List.Item>
                                )}

                                {form.values.song_request && (
                                    <List.Item>
                                        <Text fw={500}>Song Request:</Text>
                                        <Text>{form.values.song_request}</Text>
                                    </List.Item>
                                )}

                                {form.values.travel_plans && (
                                    <List.Item>
                                        <Text fw={500}>Travel Plans:</Text>
                                        <Text>{form.values.travel_plans}</Text>
                                    </List.Item>
                                )}
                            </>
                        )}

                        {form.values.message && (
                            <List.Item>
                                <Text fw={500}>Additional Message:</Text>
                                <Text>{form.values.message}</Text>
                            </List.Item>
                        )}
                    </List>

                    <Group justify="space-between" mt="md">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmation(false);
                                trackEvent(RSVPEvents.CONFIRMATION_EDITED, {
                                    code: params.code as string,
                                });
                            }}
                            color="gray"
                        >
                            Go Back & Edit
                        </Button>
                        <Button 
                            onClick={() => {
                                setShowConfirmation(false);
                                handleSubmit(form.values);
                            }}
                            color="#8b7355"
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

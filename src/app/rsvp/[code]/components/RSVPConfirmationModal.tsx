"use client";

import {
    Box,
    Text,
    Paper,
    Button,
    Stack,
    Group,
    Modal,
} from "@mantine/core";
import { RSVPFormData } from "@/types";
import { useTracking, RSVPEvents } from "@/hooks";

interface RSVPConfirmationModalProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    values: RSVPFormData;
    code: string;
    submitting: boolean;
}

export function RSVPConfirmationModal({
    opened,
    onClose,
    onConfirm,
    values,
    code,
    submitting,
}: RSVPConfirmationModalProps) {
    const { trackEvent } = useTracking();

    const handleEdit = () => {
        onClose();
        trackEvent(RSVPEvents.CONFIRMATION_EDITED, { code });
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
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
            closeButtonProps={{
                'aria-label': 'Close confirmation modal',
            }}
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
                        color: "#5a5a5a",
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
                                c={values.accepted ? "green" : "red"}
                                style={{ fontSize: "0.95rem" }}
                            >
                                {values.accepted ? "✓ Yes, I'm coming!" : "✗ No, I can't make it"}
                            </Text>
                        </Box>

                        {values.accepted && (
                            <>
                                {values.invitees.length > 1 && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.5rem" }}>
                                            Guest Attendance
                                        </Text>
                                        <Stack gap="xs">
                                            {values.invitees.map((invitee) => (
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
                                    <Text style={{ color: "#5a5a5a", fontSize: "0.95rem" }}>
                                        {values.staying_villa === "yes"
                                            ? "✓ Staying at Gran Villa Rosa"
                                            : "Arranging own accommodation"
                                        }
                                    </Text>
                                </Box>

                                {values.dietary_restrictions && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Dietary Requirements
                                        </Text>
                                        <Text style={{ color: "#5a5a5a", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {values.dietary_restrictions}
                                        </Text>
                                    </Box>
                                )}

                                {values.song_request && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Song Request
                                        </Text>
                                        <Text style={{ color: "#5a5a5a", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {values.song_request}
                                        </Text>
                                    </Box>
                                )}

                                {values.travel_plans && (
                                    <Box>
                                        <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                            Travel Plans
                                        </Text>
                                        <Text style={{ color: "#5a5a5a", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                            {values.travel_plans}
                                        </Text>
                                    </Box>
                                )}
                            </>
                        )}

                        {values.message && (
                            <Box>
                                <Text fw={600} size="sm" style={{ color: "var(--gold-dark)", marginBottom: "0.25rem" }}>
                                    Additional Message
                                </Text>
                                <Text style={{ color: "#5a5a5a", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                    {values.message}
                                </Text>
                            </Box>
                        )}
                    </Stack>
                </Paper>

                <Group justify="space-between" mt="lg" gap="md">
                    <Button
                        variant="outline"
                        onClick={handleEdit}
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
                        styles={{
                            root: {
                                '&:disabled': {
                                    borderColor: 'var(--gold)',
                                    color: 'var(--gold)',
                                    opacity: 0.6,
                                },
                            },
                        }}
                    >
                        Go Back & Edit
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="primary-cta-button"
                        size="md"
                        style={{
                            backgroundColor: "var(--gold-dark)",
                            color: "#ffffff",
                            fontWeight: 500,
                            borderRadius: "8px",
                            flex: 1,
                        }}
                        styles={{
                            root: {
                                '&:disabled': {
                                    backgroundColor: 'var(--gold)',
                                    color: '#ffffff',
                                    opacity: 0.6,
                                },
                            },
                        }}
                        loading={submitting}
                        disabled={submitting}
                    >
                        Confirm & Submit
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

"use client";

import {
    Box,
    Text,
    Textarea,
    Button,
    Stack,
    Divider,
    Group,
    TextInput,
    SimpleGrid,
    Paper,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import {
    IconUsers,
    IconBed,
    IconCheck,
    IconX,
    IconChefHat,
    IconMusic,
    IconPlane,
    IconMessage,
    IconBook,
} from "@tabler/icons-react";
import { RSVPFormData } from "@/types";
import { useTracking, RSVPEvents } from "@/hooks";

interface RSVPFormFieldsProps {
    form: UseFormReturnType<RSVPFormData>;
    code: string;
    villaOffered: boolean;
    hasChanges: boolean;
    submitting: boolean;
    originalValues: RSVPFormData | null;
    onInviteeChange: (inviteeId: number, coming: boolean) => void;
    disabled?: boolean;
}

export function RSVPFormFields({
    form,
    code,
    villaOffered,
    hasChanges,
    submitting,
    originalValues,
    onInviteeChange,
    disabled,
}: RSVPFormFieldsProps) {
    const { trackEvent } = useTracking();

    return (
        <Stack gap="xl" style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
            {/* Are you joining us? */}
            <Box mb="xl">
                <Group gap="sm" mb="md">
                    <IconBook size={20} color="#6d5a44" />
                    <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                        Are you joining us?
                    </Text>
                    <Text span style={{ color: "#e53e3e" }}>
                        *
                    </Text>
                </Group>
                <SimpleGrid cols={2} spacing="sm">
                    <Paper
                        p="lg"
                        radius="md"
                        withBorder
                        style={{
                            cursor: 'pointer',
                            borderColor: form.values.accepted ? '#22c55e' : '#dee2e6',
                            backgroundColor: form.values.accepted ? 'rgba(34, 197, 94, 0.08)' : '#fff',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => {
                            form.setFieldValue("accepted", true);
                            form.validateField("invitees");
                            trackEvent(RSVPEvents.ACCEPTANCE_CHANGED, {
                                code,
                                accepted: true,
                            });
                        }}
                    >
                        <Group justify="center" gap="xs">
                            <IconCheck size={20} color={form.values.accepted ? '#22c55e' : '#9ca3af'} />
                            <Text fw={500} style={{ color: form.values.accepted ? '#22c55e' : '#6c757d' }}>
                                {form.values.invitees.length > 1 ? "Yes, we're coming!" : "Yes, I'm coming!"}
                            </Text>
                        </Group>
                    </Paper>
                    <Paper
                        p="lg"
                        radius="md"
                        withBorder
                        style={{
                            cursor: 'pointer',
                            borderColor: !form.values.accepted ? '#ef4444' : '#dee2e6',
                            backgroundColor: !form.values.accepted ? 'rgba(239, 68, 68, 0.08)' : '#fff',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => {
                            form.setFieldValue("accepted", false);
                            form.clearFieldError("invitees");
                            trackEvent(RSVPEvents.ACCEPTANCE_CHANGED, {
                                code,
                                accepted: false,
                            });
                        }}
                    >
                        <Group justify="center" gap="xs">
                            <IconX size={20} color={!form.values.accepted ? '#ef4444' : '#9ca3af'} />
                            <Text fw={500} style={{ color: !form.values.accepted ? '#ef4444' : '#6c757d' }}>
                                {form.values.invitees.length > 1 ? "Sorry, we can't make it" : "Sorry, I can't make it"}
                            </Text>
                        </Group>
                    </Paper>
                </SimpleGrid>
            </Box>

            {/* Form fields - Only visible when 'coming' is Yes */}
            {form.values.accepted && (
                <>
                    {/* Is everyone coming? - Only visible when there are multiple invitees */}
                    {form.values.invitees.length > 1 && (
                        <Box mb="xl">
                            <Group gap="sm" mb="md">
                                <IconUsers size={20} color="#6d5a44" />
                                <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                    Is everyone coming?
                                </Text>
                                <Text span style={{ color: "#e53e3e" }}>
                                    *
                                </Text>
                            </Group>
                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                                {form.values.invitees.map(invitee => (
                                    <Paper
                                        key={invitee.id}
                                        p="md"
                                        radius="md"
                                        withBorder
                                        role="checkbox"
                                        aria-checked={invitee.coming}
                                        aria-label={invitee.name}
                                        tabIndex={0}
                                        style={{
                                            cursor: 'pointer',
                                            borderColor: invitee.coming ? '#6d5a44' : '#dee2e6',
                                            backgroundColor: invitee.coming ? 'rgba(109, 90, 68, 0.05)' : '#fff',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onClick={() => onInviteeChange(invitee.id, !invitee.coming)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onInviteeChange(invitee.id, !invitee.coming);
                                            }
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text fw={500}>{invitee.name}</Text>
                                            <Box
                                                aria-hidden="true"
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    backgroundColor: invitee.coming ? '#6d5a44' : '#e9ecef',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {invitee.coming && (
                                                    <IconCheck size={14} color="#fff" stroke={3} />
                                                )}
                                            </Box>
                                        </Group>
                                    </Paper>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}

                    {/* Invitees validation error */}
                    {form.errors.invitees && (
                        <Text size="sm" style={{ color: "#e53e3e", marginBottom: "1rem" }}>
                            {form.errors.invitees}
                        </Text>
                    )}

                    {/* Will you be staying with us? */}
                    {villaOffered && (
                        <Box mb="xl">
                            <Group gap="sm" mb="md">
                                <IconBed size={20} color="#6d5a44" />
                                <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                    Will you be staying with us?
                                </Text>
                                <Text span style={{ color: "#e53e3e" }}>
                                    *
                                </Text>
                            </Group>
                            <Text
                                size="sm"
                                style={{ color: "#5a5a5a", marginBottom: "1rem", lineHeight: 1.6 }}
                            >
                                We&apos;ve reserved a complimentary room in the venue
                                for you for Friday and Saturday nights. If you&apos;d
                                prefer to arrange your own accommodation, please
                                let us know.
                            </Text>
                            <SimpleGrid cols={2} spacing="sm">
                                <Paper
                                    p="lg"
                                    radius="md"
                                    withBorder
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: form.values.staying_villa === "yes" ? '#6d5a44' : '#dee2e6',
                                        backgroundColor: form.values.staying_villa === "yes" ? 'rgba(109, 90, 68, 0.08)' : '#fff',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onClick={() => {
                                        form.setFieldValue("staying_villa", "yes");
                                        trackEvent(RSVPEvents.VILLA_CHANGED, {
                                            code,
                                            staying: true,
                                        });
                                    }}
                                >
                                    <Group justify="center" gap="xs">
                                        <IconCheck size={20} color={form.values.staying_villa === "yes" ? '#6d5a44' : '#9ca3af'} />
                                        <Text fw={500} style={{ color: form.values.staying_villa === "yes" ? '#6d5a44' : '#6c757d' }}>
                                            {form.values.invitees.length > 1 ? "Yes, we're staying" : "Yes, I'm staying"}
                                        </Text>
                                    </Group>
                                </Paper>
                                <Paper
                                    p="lg"
                                    radius="md"
                                    withBorder
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: form.values.staying_villa === "no" ? '#6c757d' : '#dee2e6',
                                        backgroundColor: form.values.staying_villa === "no" ? 'rgba(108, 117, 125, 0.08)' : '#fff',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onClick={() => {
                                        form.setFieldValue("staying_villa", "no");
                                        trackEvent(RSVPEvents.VILLA_CHANGED, {
                                            code,
                                            staying: false,
                                        });
                                    }}
                                >
                                    <Group justify="center" gap="xs">
                                        <IconX size={20} color={form.values.staying_villa === "no" ? '#6c757d' : '#9ca3af'} />
                                        <Text fw={500} style={{ color: form.values.staying_villa === "no" ? '#6c757d' : '#6c757d' }}>
                                            {form.values.invitees.length > 1 ? "No, we'll arrange our own" : "No, I'll arrange my own"}
                                        </Text>
                                    </Group>
                                </Paper>
                            </SimpleGrid>
                        </Box>
                    )}

                    {/* Dietary restrictions */}
                    <Box mb="xl">
                        <Group gap="sm" mb="md">
                            <IconChefHat size={20} color="#6d5a44" />
                            <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                Do you have any allergies or specific dietary requests?
                            </Text>
                            <Text span size="sm" style={{ color: "#9ca3af" }}>
                                (Optional)
                            </Text>
                        </Group>
                        <Textarea
                            placeholder="Please let us know about any dietary requirements..."
                            {...form.getInputProps("dietary_restrictions")}
                            disabled={disabled}
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    trackEvent(RSVPEvents.DIETARY_FILLED, {
                                        code,
                                        length: e.target.value.length,
                                    });
                                }
                            }}
                            minRows={4}
                            maxRows={8}
                            autosize
                            size="md"
                        />
                    </Box>

                    {/* Song request */}
                    <Box mb="xl">
                        <Group gap="sm" mb="md">
                            <IconMusic size={20} color="#6d5a44" />
                            <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                Got a song request for the wedding playlist? Add it here!
                            </Text>
                            <Text span size="sm" style={{ color: "#9ca3af" }}>
                                (Optional)
                            </Text>
                        </Group>
                        <TextInput
                            placeholder="What song would you like to hear at our wedding?"
                            {...form.getInputProps("song_request")}
                            disabled={disabled}
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    trackEvent(RSVPEvents.SONG_FILLED, {
                                        code,
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
                            <IconPlane size={20} color="#6d5a44" />
                            <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                Please add any travel plans you have
                            </Text>
                            <Text span size="sm" style={{ color: "#9ca3af" }}>
                                (Optional)
                            </Text>
                        </Group>
                        <Textarea
                            placeholder="Flight number, day of travel etc."
                            {...form.getInputProps("travel_plans")}
                            disabled={disabled}
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    trackEvent(RSVPEvents.TRAVEL_FILLED, {
                                        code,
                                        length: e.target.value.length,
                                    });
                                }
                            }}
                            minRows={4}
                            maxRows={8}
                            autosize
                            size="md"
                        />
                    </Box>
                </>
            )}

            {/* Additional message */}
            <Box mb="xl">
                <Group gap="sm" mb="md">
                    <IconMessage size={20} color="#6d5a44" />
                    <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                        Anything else you&apos;d like us to know?
                    </Text>
                    <Text span size="sm" style={{ color: "#9ca3af" }}>
                        (Optional)
                    </Text>
                </Group>
                <Textarea
                    placeholder="Any other information you'd like to share..."
                    {...form.getInputProps("message")}
                    disabled={disabled}
                    onBlur={(e) => {
                        if (e.target.value.trim()) {
                            trackEvent(RSVPEvents.MESSAGE_FILLED, {
                                code,
                                length: e.target.value.length,
                            });
                        }
                    }}
                    minRows={5}
                    maxRows={12}
                    autosize
                    size="md"
                />
            </Box>

            {!disabled && (
                <>
                    <Divider style={{ borderColor: "rgba(139, 115, 85, 0.2)" }} />

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        size="lg"
                        loading={submitting}
                        disabled={submitting || !hasChanges}
                        className="primary-cta-button"
                        style={{
                            backgroundColor: "#6d5a44",
                            color: "#ffffff",
                            borderRadius: "8px",
                            fontWeight: 500,
                            letterSpacing: "0.02em",
                        }}
                        styles={{
                            root: {
                                '&:disabled': {
                                    backgroundColor: '#8b7355',
                                    color: '#ffffff',
                                    opacity: 0.6,
                                },
                            },
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
                </>
            )}
        </Stack>
    );
}

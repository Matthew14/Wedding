"use client";

import {
    Box,
    Text,
    Checkbox,
    Textarea,
    Button,
    Stack,
    Divider,
    Radio,
    Group,
    TextInput,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import {
    IconUsers,
    IconBed,
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
    onInviteeChange: (inviteeId: string, coming: boolean) => void;
}

export function RSVPFormFields({
    form,
    code,
    villaOffered,
    hasChanges,
    submitting,
    originalValues,
    onInviteeChange,
}: RSVPFormFieldsProps) {
    const { trackEvent } = useTracking();

    return (
        <Stack gap="xl">
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
                <Radio.Group
                    value={form.values.accepted ? "yes" : "no"}
                    onChange={(value) => {
                        const isAccepted = value === "yes";
                        form.setFieldValue("accepted", isAccepted);
                        if (isAccepted) {
                            form.validateField("invitees");
                        } else {
                            form.clearFieldError("invitees");
                        }

                        trackEvent(RSVPEvents.ACCEPTANCE_CHANGED, {
                            code,
                            accepted: isAccepted,
                        });
                    }}
                    required
                >
                    <Group gap="lg">
                        <Radio value="yes" label="Yes" size="md" data-ph-capture-attribute="true" />
                        <Radio value="no" label="No" size="md" data-ph-capture-attribute="true" />
                    </Group>
                </Radio.Group>
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
                            <Stack gap="sm">
                                {form.values.invitees.map(invitee => (
                                    <Checkbox
                                        key={invitee.id}
                                        label={invitee.name}
                                        checked={invitee.coming}
                                        onChange={(event) => {
                                            onInviteeChange(
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
                            <Radio.Group
                                {...form.getInputProps("staying_villa")}
                                onChange={(value) => {
                                    form.setFieldValue("staying_villa", value);
                                    trackEvent(RSVPEvents.VILLA_CHANGED, {
                                        code,
                                        staying: value === "yes",
                                    });
                                }}
                                required
                            >
                                <Group gap="lg">
                                    <Radio
                                        value="yes"
                                        label={form.values.invitees.length > 1 ? "Yes, we are staying" : "Yes, I am staying"}
                                        size="md"
                                        data-ph-capture-attribute="true"
                                    />
                                    <Radio
                                        value="no"
                                        label={form.values.invitees.length > 1 ? "No, we will not be staying" : "No, I will not be staying"}
                                        size="md"
                                        data-ph-capture-attribute="true"
                                    />
                                </Group>
                            </Radio.Group>
                        </Box>
                    )}

                    {/* Dietary restrictions */}
                    <Box mb="xl">
                        <Group gap="sm" mb="md">
                            <IconChefHat size={20} color="#6d5a44" />
                            <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                Do you have any allergies or specific dietary requests?
                            </Text>
                        </Group>
                        <Textarea
                            placeholder="Please let us know about any dietary requirements..."
                            {...form.getInputProps("dietary_restrictions")}
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    trackEvent(RSVPEvents.DIETARY_FILLED, {
                                        code,
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
                            <IconMusic size={20} color="#6d5a44" />
                            <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                                Got a song request for the wedding playlist? Add it here!
                            </Text>
                        </Group>
                        <TextInput
                            placeholder="What song would you like to hear at our wedding?"
                            {...form.getInputProps("song_request")}
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
                        </Group>
                        <Textarea
                            placeholder="Flight number, day of travel etc."
                            {...form.getInputProps("travel_plans")}
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    trackEvent(RSVPEvents.TRAVEL_FILLED, {
                                        code,
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
                    <IconMessage size={20} color="#6d5a44" />
                    <Text size="lg" fw={500} style={{ color: "#2d2d2d" }}>
                        Anything else you&apos;d like us to know?
                    </Text>
                </Group>
                <Textarea
                    placeholder="Any other information you'd like to share..."
                    {...form.getInputProps("message")}
                    onBlur={(e) => {
                        if (e.target.value.trim()) {
                            trackEvent(RSVPEvents.MESSAGE_FILLED, {
                                code,
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
        </Stack>
    );
}

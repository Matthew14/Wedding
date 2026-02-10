"use client";

import { Box, Title, Text, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface RSVPFormHeaderProps {
    guestNames: string;
    infoText: string;
    disabled?: boolean;
}

export function RSVPFormHeader({ guestNames, infoText, disabled }: RSVPFormHeaderProps) {
    return (
        <Box style={{ textAlign: "center", marginBottom: "1rem" }}>
            {guestNames && (
                <Title
                    order={1}
                    style={{
                        fontSize: "clamp(2.5rem, 7vw, 4rem)",
                        fontWeight: 400,
                        color: "var(--gold-dark)",
                        marginBottom: "0.5rem",
                        fontFamily: "var(--font-great-vibes), cursive",
                        letterSpacing: "0.02em",
                    }}
                >
                    {guestNames}
                </Title>
            )}
            {disabled ? (
                <Alert
                    icon={<IconInfoCircle size={20} />}
                    color="gray"
                    variant="light"
                    radius="md"
                    style={{ textAlign: "left", maxWidth: 600, margin: "0 auto" }}
                >
                    <Text size="md" style={{ lineHeight: 1.6 }}>
                        The deadline for amending your RSVP has now passed. If you need to
                        let us know about any changes, please contact us directly.
                    </Text>
                </Alert>
            ) : infoText ? (
                <Text size="lg" style={{ color: "#5a5a5a", lineHeight: 1.8, maxWidth: 600, margin: "0 auto" }} pb="md">
                    {infoText}
                </Text>
            ) : (
                <Text size="lg" style={{ color: "#5a5a5a", lineHeight: 1.8, maxWidth: 600, margin: "0 auto" }}>
                    Let us know if you&apos;re coming to our wedding! Once you&apos;ve filled out this
                    form, you will still be able to amend your details here up until the 1st of
                    March. After that please get in touch if something changes.
                </Text>
            )}
        </Box>
    );
}

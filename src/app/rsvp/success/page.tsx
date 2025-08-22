"use client";

import { Container, Title, Text, Paper, Button, Stack, Box, Alert } from "@mantine/core";
import { IconCheck, IconHeart, IconHeartBroken } from "@tabler/icons-react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useSearchParams } from "next/navigation";

export default function RSVPSuccessPage() {
    const searchParams = useSearchParams();
    const isComing = searchParams.get("coming") === "yes";
    const rsvpCode = searchParams.get("code");
    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="sm" py="xl">
                        <Stack gap="xl" align="center">
                            {/* Success Icon */}
                            <Box style={{ textAlign: "center" }}>
                                {isComing ? (
                                    <IconCheck size={80} color="#22c55e" style={{ marginBottom: "1rem" }} />
                                ) : (
                                    <IconHeartBroken size={80} color="#6b7280" style={{ marginBottom: "1rem" }} />
                                )}
                            </Box>

                            {/* Success Message */}
                            <Box style={{ textAlign: "center" }}>
                                <Title
                                    order={1}
                                    style={{
                                        fontSize: "clamp(2rem, 6vw, 3rem)",
                                        fontWeight: 300,
                                        color: "#495057",
                                        marginBottom: "1rem",
                                        fontFamily: "serif",
                                    }}
                                >
                                    {isComing ? "Thank You!" : "Response Received"}
                                </Title>
                                <Text size="lg" style={{ color: "#6c757d", marginBottom: "1rem" }}>
                                    Your RSVP has been submitted successfully.
                                </Text>
                                <Text size="sm" style={{ color: "#8b7355" }}>
                                    {isComing 
                                        ? "We're looking forward to celebrating with you!" 
                                        : "We're sorry you can't make it, but we appreciate you letting us know."
                                    }
                                </Text>
                            </Box>

                            {/* Success Details */}
                            <Paper shadow="md" radius="lg" p="xl" style={{ width: "100%", maxWidth: "500px" }}>
                                <Stack gap="md">
                                    <Alert
                                        icon={isComing ? <IconHeart size={16} /> : <IconHeartBroken size={16} />}
                                        title="What happens next?"
                                        color={isComing ? "#22c55e" : "#6b7280"}
                                        variant="light"
                                    >
                                        <Text size="sm">
                                            {isComing 
                                                ? "We've received your RSVP and will be in touch with any additional details as the wedding approaches."
                                                : "We've received your response and will update our guest list accordingly. We'll miss you on our special day!"
                                            }
                                        </Text>
                                    </Alert>

                                    <Text size="sm" style={{ color: "#6c757d", textAlign: "center" }}>
                                        If you need to make any changes to your RSVP, 
                                        you can go back and amend it, or just contact us.
                                    </Text>
                                    <Button component={Link} href={rsvpCode ? `/rsvp/${rsvpCode}` : "/rsvp"} variant="outline" color="#8b7355" size="lg" fullWidth>
                                        Amend RSVP
                                    </Button>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

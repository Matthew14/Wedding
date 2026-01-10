"use client";

import { Container, Title, Text, Paper, Button, Stack, Box, Alert } from "@mantine/core";
import { IconCheck, IconHeart, IconHeartBroken } from "@tabler/icons-react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useTracking, RSVPEvents } from "@/hooks";

function RSVPSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const acceptedParam = searchParams.get("accepted");
    const rsvpCode = searchParams.get("code");
    const isComing = acceptedParam === "yes";
    const { trackEvent } = useTracking();

    // Redirect to RSVP page if required params are missing
    useEffect(() => {
        if (!rsvpCode || !acceptedParam) {
            router.replace("/rsvp");
            return;
        }
    }, [rsvpCode, acceptedParam, router]);

    useEffect(() => {
        // Only track if we have valid params
        if (!rsvpCode || !acceptedParam) return;

        // Page view tracked by PageViewTracker component
        // This event confirms the complete RSVP journey
        trackEvent(RSVPEvents.SUCCESS_PAGE_VIEWED, {
            code: rsvpCode,
            accepted: isComing,
        });
    }, [trackEvent, rsvpCode, acceptedParam, isComing]);

    // Don't render content while redirecting
    if (!rsvpCode || !acceptedParam) {
        return (
            <Container size="sm" py="xl">
                <Stack gap="xl" align="center">
                    <Text>Redirecting...</Text>
                </Stack>
            </Container>
        );
    }

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="sm" py="xl" className="fade-in">
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
                                        fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
                                        fontWeight: 400,
                                        color: "var(--text-primary)",
                                        marginBottom: "0",
                                        fontFamily: "var(--font-playfair), serif",
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {isComing ? "Thank You!" : "Response Received"}
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                <Text size="lg" style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.8 }}>
                                    Your RSVP has been submitted successfully.
                                </Text>
                                <Text size="sm" style={{ color: "var(--gold-dark)" }}>
                                    {isComing
                                        ? "We're looking forward to celebrating with you!"
                                        : "We're sorry you can't make it, but we appreciate you letting us know."
                                    }
                                </Text>
                            </Box>

                            {/* Success Details */}
                            <Paper className="elegant-card" radius="lg" p="xl" style={{ width: "100%", maxWidth: "500px" }}>
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

                                    <Text size="sm" style={{ color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7 }}>
                                        If you need to make any changes to your RSVP,
                                        you can go back and amend it, or just contact us.
                                    </Text>
                                    <Button
                                        component={Link}
                                        href={rsvpCode ? `/rsvp/${rsvpCode}` : "/rsvp"}
                                        variant="outline"
                                        className="secondary-cta-button"
                                        style={{
                                            borderColor: "var(--gold-dark)",
                                            color: "var(--gold-dark)",
                                            fontWeight: 500,
                                            borderWidth: "2px",
                                        }}
                                        size="lg"
                                        fullWidth
                                        onClick={() => {
                                            trackEvent(RSVPEvents.AMENDMENT_CLICKED, {
                                                code: rsvpCode,
                                                accepted: isComing,
                                            });
                                        }}
                                    >
                                        Amend RSVP
                                    </Button>

                                    {/* Calendar Dropdown - Only show for accepted RSVPs */}
                                    {isComing && <AddToCalendarButton rsvpCode={rsvpCode} />}
                                </Stack>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

export default function RSVPSuccessPage() {
    return (
        <Suspense fallback={
            <Container size="sm" py="xl">
                <Stack gap="xl" align="center">
                    <Text>Loading...</Text>
                </Stack>
            </Container>
        }>
            <RSVPSuccessContent />
        </Suspense>
    );
}

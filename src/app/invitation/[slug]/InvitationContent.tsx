"use client";

import {
    Container,
    Title,
    Text,
    Button,
    Stack,
    Box,
    Paper,
    Group,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { useTracking, InvitationEvents } from "@/hooks";
import { formatGuestNames, InvitationData } from "@/utils/invitation";

interface InvitationContentProps {
    slug: string;
}

export default function InvitationContent({ slug }: InvitationContentProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
    const { trackEvent } = useTracking();

    useEffect(() => {
        const abortController = new AbortController();

        const fetchInvitation = async () => {
            // Reset state at the start of fetch to avoid race conditions
            // This ensures state resets are tied to this specific request
            setLoading(true);
            setError(false);
            setInvitationData(null);

            try {
                if (!slug) {
                    setError(true);
                    trackEvent(InvitationEvents.INVALID_LINK, {
                        reason: "missing_slug",
                    });
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/api/invitation/${slug}`, {
                    signal: abortController.signal,
                });

                // Don't update state if request was aborted
                if (abortController.signal.aborted) {
                    return;
                }

                if (response.ok) {
                    const data: InvitationData = await response.json();
                    setInvitationData(data);
                    trackEvent(InvitationEvents.PAGE_VIEWED, {
                        code: data.code,
                        guest_count: data.guestNames.length,
                    });
                } else {
                    setError(true);
                    trackEvent(InvitationEvents.INVALID_LINK, {
                        reason: "invalid_code_or_names",
                    });
                }
            } catch (err) {
                // Ignore abort errors - these are expected when navigating away
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }
                if (process.env.NODE_ENV === "development") {
                    console.error("Error fetching invitation:", err);
                }
                setError(true);
                trackEvent(InvitationEvents.INVALID_LINK, {
                    reason: "fetch_error",
                });
            } finally {
                // Only update loading state if not aborted
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchInvitation();

        // Cleanup: abort in-flight request when slug changes or component unmounts
        return () => {
            abortController.abort();
        };
    }, [slug, trackEvent]);

    const handleRSVPClick = () => {
        if (invitationData) {
            trackEvent(InvitationEvents.RSVP_CLICKED, {
                code: invitationData.code,
            });
            router.push(`/rsvp/${invitationData.code}`);
        }
    };

    if (loading) {
        return (
            <>
                <Navigation />
                <main id="main-content">
                    <Box style={{ paddingTop: 56 }}>
                        <Container size="sm" py="xl">
                            <Stack gap="xl" align="center" justify="center" style={{ minHeight: "60vh" }}>
                                <Text
                                    size="lg"
                                    style={{ color: "var(--text-secondary)" }}
                                    role="status"
                                    aria-live="polite"
                                >
                                    Loading your invitation...
                                </Text>
                            </Stack>
                        </Container>
                    </Box>
                </main>
            </>
        );
    }

    if (error || !invitationData) {
        return (
            <>
                <Navigation />
                <main id="main-content">
                    <Box style={{ paddingTop: 56 }}>
                        <Container size="sm" py="xl" className="fade-in">
                            <Stack gap="xl" align="center" justify="center" style={{ minHeight: "60vh" }}>
                                <Paper
                                    className="elegant-card"
                                    radius="lg"
                                    p="xl"
                                    style={{ textAlign: "center", maxWidth: 500 }}
                                >
                                    <Title
                                        order={2}
                                        style={{
                                            fontSize: "1.75rem",
                                            fontWeight: 400,
                                            color: "var(--text-primary)",
                                            fontFamily: "var(--font-playfair), serif",
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        Invitation Not Found
                                    </Title>
                                    <Text
                                        size="md"
                                        style={{
                                            color: "var(--text-secondary)",
                                            lineHeight: 1.7,
                                            marginBottom: "1.5rem",
                                        }}
                                    >
                                        We couldn&apos;t find this invitation. Please check the link
                                        in your invitation email or contact us for assistance.
                                    </Text>
                                    <Button
                                        onClick={() => router.push("/rsvp")}
                                        variant="outline"
                                        className="secondary-cta-button"
                                        style={{
                                            borderColor: "var(--gold-dark)",
                                            color: "var(--gold-dark)",
                                            borderWidth: "2px",
                                            borderRadius: "8px",
                                        }}
                                    >
                                        Go to RSVP Page
                                    </Button>
                                </Paper>
                            </Stack>
                        </Container>
                    </Box>
                </main>
            </>
        );
    }

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56, background: "linear-gradient(180deg, #fdfcfa 0%, #f8f6f1 100%)", minHeight: "100vh" }}>
                    <Container size="sm" py="xl" className="fade-in">
                        <Stack gap="md" align="center">
                            {/* Invitation Card */}
                            <Paper
                                radius="lg"
                                p="xl"
                                style={{
                                    textAlign: "center",
                                    maxWidth: 600,
                                    width: "100%",
                                    background: "linear-gradient(180deg, #fdfcfa 0%, #f9f7f2 100%)",
                                    boxShadow: "0 4px 24px rgba(139, 115, 85, 0.12)",
                                }}
                            >
                                <Stack gap="sm" align="center">
                                    {/* Villa Rosa Image */}
                                    <Box
                                        style={{
                                            width: "100%",
                                            maxWidth: 400,
                                            position: "relative",
                                            aspectRatio: "4/3",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <Image
                                            src="/villarosa.png"
                                            alt="Gran Villa Rosa - Wedding Venue"
                                            fill
                                            sizes="(max-width: 600px) 100vw, 400px"
                                            style={{
                                                objectFit: "contain",
                                            }}
                                            priority
                                        />
                                    </Box>

                                    {/* Couple Names - Script Font */}
                                    <Title
                                        order={1}
                                        style={{
                                            fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
                                            fontWeight: 400,
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-great-vibes), cursive",
                                            letterSpacing: "0.02em",
                                            lineHeight: 1.1,
                                            marginBottom: "0.25rem",
                                        }}
                                    >
                                        Rebecca & Matthew
                                    </Title>

                                    {/* Wish to invite */}
                                    <Text
                                        style={{
                                            fontSize: "clamp(1rem, 3vw, 1.2rem)",
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-cormorant), serif",
                                            letterSpacing: "0.1em",
                                            marginTop: "0.5rem",
                                        }}
                                    >
                                        Wish to invite
                                    </Text>

                                    {/* Guest Names */}
                                    <Title
                                        order={2}
                                        style={{
                                            fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
                                            fontWeight: 400,
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-cormorant), serif",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        {formatGuestNames(invitationData.guestNames)}
                                    </Title>

                                    {/* To join them */}
                                    <Text
                                        style={{
                                            fontSize: "clamp(1rem, 3vw, 1.2rem)",
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-cormorant), serif",
                                            letterSpacing: "0.1em",
                                        }}
                                    >
                                        to join them to celebrate their marriage
                                    </Text>

                                    {/* Venue and Date */}
                                    <Box style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
                                        {/* Desktop: Side by Side */}
                                        <Group
                                            justify="center"
                                            align="center"
                                            gap="xl"
                                            visibleFrom="xs"
                                        >
                                            {/* Venue Address */}
                                            <Box style={{ textAlign: "left" }}>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Gran Villa Rosa
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Vilanova i la Geltrú
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    08800 Barcelona
                                                </Text>
                                            </Box>

                                            {/* Vertical Divider */}
                                            <div
                                                className="decorative-divider"
                                                style={{ margin: "0 1rem", transform: "rotate(90deg)", width: 60 }}
                                            />

                                            {/* Date */}
                                            <Box style={{ textAlign: "center" }}>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Saturday, 23<sup>rd</sup> May 2026
                                                </Text>
                                            </Box>
                                        </Group>

                                        {/* Mobile: Stacked */}
                                        <Stack align="center" gap="md" hiddenFrom="xs">
                                            {/* Venue Address */}
                                            <Box style={{ textAlign: "center" }}>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Gran Villa Rosa
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Vilanova i la Geltrú
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    08800 Barcelona
                                                </Text>
                                            </Box>

                                            {/* Horizontal Divider */}
                                            <div className="decorative-divider" style={{ width: 60 }} />

                                            {/* Date */}
                                            <Box style={{ textAlign: "center" }}>
                                                <Text
                                                    style={{
                                                        fontSize: "1rem",
                                                        color: "var(--gold-dark)",
                                                        fontFamily: "var(--font-cormorant), serif",
                                                        letterSpacing: "0.05em",
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    Saturday, 23<sup>rd</sup> May 2026
                                                </Text>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* RSVP CTA Button */}
                                    <Button
                                        onClick={handleRSVPClick}
                                        size="lg"
                                        variant="outline"
                                        style={{
                                            borderColor: "var(--gold-dark)",
                                            color: "var(--gold-dark)",
                                            borderRadius: 8,
                                            padding: "12px 48px",
                                            fontSize: "1.1rem",
                                            fontFamily: "var(--font-cormorant), serif",
                                            fontWeight: 500,
                                            letterSpacing: "0.1em",
                                            borderWidth: "2px",
                                            transition: "all 0.3s ease",
                                            marginTop: "1rem",
                                            marginBottom: "1rem",
                                            backgroundColor: "transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "var(--gold-dark)";
                                            e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                            e.currentTarget.style.color = "var(--gold-dark)";
                                        }}
                                    >
                                        View your RSVP
                                    </Button>

                                    {/* Schedule link */}
                                    <Box style={{ marginTop: "0.5rem" }}>
                                        <Text
                                            component="a"
                                            href={`/schedule?from=${slug}`}
                                            style={{
                                                fontSize: "0.95rem",
                                                color: "var(--gold-dark)",
                                                fontFamily: "var(--font-cormorant), serif",
                                                letterSpacing: "0.05em",
                                                lineHeight: 1.6,
                                                textDecoration: "underline",
                                                textUnderlineOffset: "3px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            View the schedule
                                        </Text>
                                    </Box>

                                    {/* Invitation Code */}
                                    <Text
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-cormorant), serif",
                                            letterSpacing: "0.1em",
                                            marginTop: "1.5rem",
                                        }}
                                    >
                                        Invitation Code: <strong>{invitationData.code}</strong>
                                    </Text>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

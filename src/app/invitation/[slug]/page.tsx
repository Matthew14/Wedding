"use client";

import {
    Container,
    Title,
    Text,
    Button,
    Stack,
    Box,
    Paper,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useTracking, InvitationEvents } from "@/hooks";

interface InvitationData {
    valid: boolean;
    code: string;
    guestNames: string[];
    invitationId: string;
}

export default function InvitationPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
    const { trackEvent } = useTracking();

    useEffect(() => {
        const abortController = new AbortController();

        const fetchInvitation = async () => {
            try {
                const slug = params.slug as string;

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
                console.error("Error fetching invitation:", err);
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

        // Reset state when slug changes
        setLoading(true);
        setError(false);
        setInvitationData(null);

        fetchInvitation();

        // Cleanup: abort in-flight request when slug changes or component unmounts
        return () => {
            abortController.abort();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.slug]);

    const handleRSVPClick = () => {
        if (invitationData) {
            trackEvent(InvitationEvents.RSVP_CLICKED, {
                code: invitationData.code,
            });
            router.push(`/rsvp/${invitationData.code}`);
        }
    };

    // Format guest names for display
    const formatGuestNames = (names: string[]): string => {
        if (names.length === 1) {
            return names[0];
        }
        if (names.length === 2) {
            return `${names[0]} & ${names[1]}`;
        }
        return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
    };

    if (loading) {
        return (
            <>
                <Navigation />
                <main id="main-content">
                    <Box style={{ paddingTop: 56 }}>
                        <Container size="sm" py="xl">
                            <Stack gap="xl" align="center" justify="center" style={{ minHeight: "60vh" }}>
                                <Text size="lg" style={{ color: "var(--text-secondary)" }}>
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
                <Box style={{ paddingTop: 56 }}>
                    <Container size="sm" py="xl" className="fade-in">
                        <Stack gap="xl" align="center">
                            {/* Invitation Card */}
                            <Paper
                                className="elegant-card"
                                radius="lg"
                                p="xl"
                                style={{
                                    textAlign: "center",
                                    maxWidth: 550,
                                    width: "100%",
                                    background: "linear-gradient(180deg, #ffffff 0%, #faf8f5 100%)",
                                    border: "2px solid rgba(139, 115, 85, 0.2)",
                                }}
                            >
                                <Stack gap="lg" align="center">
                                    {/* Couple Names */}
                                    <Title
                                        order={1}
                                        style={{
                                            fontSize: "clamp(2rem, 6vw, 2.75rem)",
                                            fontWeight: 400,
                                            color: "var(--text-primary)",
                                            fontFamily: "var(--font-playfair), serif",
                                            letterSpacing: "0.02em",
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Rebecca & Matthew
                                    </Title>

                                    {/* Date */}
                                    <Text
                                        style={{
                                            fontSize: "clamp(1rem, 3vw, 1.25rem)",
                                            fontWeight: 300,
                                            color: "var(--gold-dark)",
                                            fontFamily: "var(--font-great-vibes), cursive",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        22 - 24 May 2026
                                    </Text>

                                    <div className="decorative-divider" style={{ margin: "0.5rem auto" }}></div>

                                    {/* Personal Greeting */}
                                    <Box style={{ marginTop: "0.5rem" }}>
                                        <Text
                                            style={{
                                                fontSize: "1.125rem",
                                                color: "var(--text-secondary)",
                                                fontStyle: "italic",
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            Dear
                                        </Text>
                                        <Title
                                            order={2}
                                            style={{
                                                fontSize: "clamp(1.5rem, 5vw, 2rem)",
                                                fontWeight: 400,
                                                color: "var(--gold-dark)",
                                                fontFamily: "var(--font-great-vibes), cursive",
                                                letterSpacing: "0.02em",
                                            }}
                                        >
                                            {formatGuestNames(invitationData.guestNames)}
                                        </Title>
                                    </Box>

                                    {/* Invitation Text */}
                                    <Text
                                        size="lg"
                                        style={{
                                            color: "var(--text-primary)",
                                            lineHeight: 1.8,
                                            maxWidth: 450,
                                            marginTop: "1rem",
                                        }}
                                    >
                                        You are cordially invited to celebrate our wedding
                                    </Text>

                                    {/* Venue */}
                                    <Box style={{ marginTop: "0.5rem" }}>
                                        <Text
                                            style={{
                                                fontSize: "1.25rem",
                                                fontWeight: 400,
                                                color: "var(--text-primary)",
                                                fontFamily: "var(--font-great-vibes), cursive",
                                            }}
                                        >
                                            Gran Villa Rosa
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: "1rem",
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Vilanova i la Geltrú, Spain
                                        </Text>
                                    </Box>

                                    <div className="decorative-divider" style={{ margin: "1rem auto" }}></div>

                                    {/* RSVP CTA Button */}
                                    <Button
                                        onClick={handleRSVPClick}
                                        size="xl"
                                        className="primary-cta-button"
                                        style={{
                                            backgroundColor: "var(--gold-dark)",
                                            color: "#ffffff",
                                            borderRadius: 30,
                                            padding: "16px 48px",
                                            fontSize: "1.25rem",
                                            fontWeight: 600,
                                            boxShadow: "0 6px 24px rgba(109, 90, 68, 0.35)",
                                            transition: "all 0.3s ease",
                                            marginTop: "0.5rem",
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        Click to RSVP
                                    </Button>

                                    <Text
                                        size="sm"
                                        style={{
                                            color: "var(--text-secondary)",
                                            marginTop: "0.5rem",
                                        }}
                                    >
                                        We can&apos;t wait to celebrate with you!
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

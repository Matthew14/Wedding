"use client";

import { Container, Title, Text, Paper, Button, Stack, Box, Alert, Menu } from "@mantine/core";
import { IconCheck, IconHeart, IconHeartBroken, IconCalendar, IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useTracking, RSVPEvents } from "@/hooks";

// Helper function to generate Google Calendar URL
const generateGoogleCalendarUrl = () => {
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: "Rebecca & Matthew's Wedding",
        dates: "20260523/20260524", // All-day event format
        details:
            "Join us for our wedding celebration at Gran Villa Rosa in Vilanova i la Geltrú, Spain. Three unforgettable days of celebration!",
        location: "Gran Villa Rosa, Vilanova i la Geltrú, Spain",
        ctz: "Europe/Madrid",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Helper function to handle .ics download
const handleIcsDownload = async (
    rsvpCode: string,
    calendarType: string,
    trackEvent: (eventName: string, properties?: Record<string, unknown>) => void
) => {
    try {
        const response = await fetch(`/api/calendar/${rsvpCode}`);

        if (!response.ok) {
            throw new Error("Failed to download calendar file");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "rebecca-matthew-wedding.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Track successful download
        trackEvent(RSVPEvents.CALENDAR_DOWNLOADED, {
            code: rsvpCode,
            calendar_type: calendarType,
        });
    } catch (error) {
        console.error("Error downloading calendar:", error);
        // Track error
        trackEvent(RSVPEvents.CALENDAR_DOWNLOAD_ERROR, {
            code: rsvpCode,
            calendar_type: calendarType,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

function RSVPSuccessContent() {
    const searchParams = useSearchParams();
    const isComing = searchParams.get("accepted") === "yes";
    const rsvpCode = searchParams.get("code");
    const { trackEvent } = useTracking();

    useEffect(() => {
        // Page view tracked by PageViewTracker component
        // This event confirms the complete RSVP journey
        trackEvent(RSVPEvents.SUCCESS_PAGE_VIEWED, {
            code: rsvpCode,
            accepted: isComing,
        });
    }, [trackEvent, rsvpCode, isComing]);

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
                                    {isComing && (
                                        <Menu shadow="md" width={250} position="bottom" withinPortal>
                                            <Menu.Target>
                                                <Button
                                                    variant="light"
                                                    leftSection={<IconCalendar size={18} />}
                                                    rightSection={<IconChevronDown size={18} />}
                                                    style={{
                                                        backgroundColor: "rgba(139, 115, 85, 0.1)",
                                                        color: "var(--gold-dark)",
                                                        fontWeight: 500,
                                                    }}
                                                    size="lg"
                                                    fullWidth
                                                >
                                                    Add to Calendar
                                                </Button>
                                            </Menu.Target>

                                            <Menu.Dropdown>
                                                <Menu.Label>Select Calendar</Menu.Label>

                                                <Menu.Item
                                                    leftSection={<IconCalendar size={16} />}
                                                    onClick={() => {
                                                        window.open(generateGoogleCalendarUrl(), "_blank");
                                                        trackEvent(RSVPEvents.CALENDAR_CLICKED, {
                                                            code: rsvpCode,
                                                            calendar_type: "google",
                                                        });
                                                    }}
                                                >
                                                    Google Calendar
                                                </Menu.Item>

                                                <Menu.Item
                                                    leftSection={<IconCalendar size={16} />}
                                                    onClick={() =>
                                                        handleIcsDownload(rsvpCode || "", "apple", trackEvent)
                                                    }
                                                >
                                                    Apple Calendar
                                                </Menu.Item>

                                                <Menu.Item
                                                    leftSection={<IconCalendar size={16} />}
                                                    onClick={() =>
                                                        handleIcsDownload(rsvpCode || "", "outlook", trackEvent)
                                                    }
                                                >
                                                    Outlook
                                                </Menu.Item>

                                                <Menu.Divider />

                                                <Menu.Item
                                                    leftSection={<IconCalendar size={16} />}
                                                    onClick={() =>
                                                        handleIcsDownload(rsvpCode || "", "other", trackEvent)
                                                    }
                                                >
                                                    Download .ics File
                                                </Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    )}
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

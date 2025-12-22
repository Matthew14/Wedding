'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Paper } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { useTracking, SiteEvents } from '@/hooks';

export default function NotFound() {
    const { trackEvent } = useTracking();

    useEffect(() => {
        // Page view tracked by PageViewTracker component
        trackEvent(SiteEvents.PAGE_404, {
            url: window.location.href,
            referrer: document.referrer,
        });
    }, [trackEvent]);

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Container size="sm" py="xl" style={{ paddingTop: 100 }}>
                    <Paper shadow="md" radius="lg" p="xl">
                        <Stack gap="xl" align="center">
                            <IconError404 size={100} color="var(--gold-dark)" stroke={1.5} />
                            <Title
                                order={1}
                                style={{
                                    fontSize: 'clamp(2rem, 6vw, 3rem)',
                                    fontWeight: 300,
                                    color: "var(--text-primary)",
                                    textAlign: 'center',
                                }}
                            >
                                Page Not Found
                            </Title>
                            <Text size="lg" style={{ textAlign: 'center', color: "var(--text-secondary)" }}>
                                Sorry, we couldn&apos;t find the page you&apos;re looking for.
                            </Text>
                            <Text size="md" style={{ textAlign: 'center', color: "var(--text-secondary)" }}>
                                The page might have been moved or doesn&apos;t exist. If you followed a link from
                                your invitation, please check the URL and try again.
                            </Text>
                            <Button
                                component={Link}
                                href="/"
                                size="lg"
                                variant="filled"
                                className="primary-cta-button"
                                style={{
                                    backgroundColor: "var(--gold-dark)",
                                    borderColor: "var(--gold-dark)",
                                    color: "#ffffff",
                                    borderRadius: 30,
                                    padding: "12px 30px",
                                    fontSize: "18px",
                                    fontWeight: 600,
                                    boxShadow: "0 4px 16px rgba(109, 90, 68, 0.3)",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                Go to Homepage
                            </Button>
                        </Stack>
                    </Paper>
                </Container>
            </main>
        </>
    );
}

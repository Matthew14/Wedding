'use client';

import { useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Paper } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { useTracking, SiteEvents } from '@/hooks';

export default function NotFound() {
    const { trackEvent, trackPageView } = useTracking();

    useEffect(() => {
        trackPageView('404 Not Found');
        trackEvent(SiteEvents.PAGE_404, {
            url: window.location.href,
            referrer: document.referrer,
        });
    }, [trackEvent, trackPageView]);

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Container size="sm" py="xl" style={{ paddingTop: 100 }}>
                    <Paper shadow="md" radius="lg" p="xl">
                        <Stack gap="xl" align="center">
                            <IconError404 size={100} color="#8b7355" stroke={1.5} />
                            <Title
                                order={1}
                                style={{
                                    fontSize: 'clamp(2rem, 6vw, 3rem)',
                                    fontWeight: 300,
                                    color: '#8b7355',
                                    textAlign: 'center',
                                }}
                            >
                                Page Not Found
                            </Title>
                            <Text size="lg" style={{ textAlign: 'center', color: '#6c757d' }}>
                                Sorry, we couldn&apos;t find the page you&apos;re looking for.
                            </Text>
                            <Text size="md" style={{ textAlign: 'center', color: '#6c757d' }}>
                                The page might have been moved or doesn&apos;t exist. If you followed a link from
                                your invitation, please check the URL and try again.
                            </Text>
                            <Button component={Link} href="/" size="lg" color="#8b7355">
                                Go to Homepage
                            </Button>
                        </Stack>
                    </Paper>
                </Container>
            </main>
        </>
    );
}

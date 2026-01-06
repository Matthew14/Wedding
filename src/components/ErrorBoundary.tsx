'use client';

import { Component, ReactNode } from 'react';
import { usePostHog } from 'posthog-js/react';
import { Container, Title, Text, Button, Stack, Paper, Code } from '@mantine/core';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Wrapper component to access PostHog hook
function ErrorBoundaryWithPostHog({ children }: ErrorBoundaryProps) {
    const posthog = usePostHog();
    return <ErrorBoundaryInner posthog={posthog}>{children}</ErrorBoundaryInner>;
}

// Class component for error boundary
class ErrorBoundaryInner extends Component<
    ErrorBoundaryProps & { posthog: ReturnType<typeof usePostHog> },
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps & { posthog: ReturnType<typeof usePostHog> }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log the error to PostHog
        if (this.props.posthog) {
            this.props.posthog.captureException(error, {
                componentStack: errorInfo.componentStack,
                errorBoundary: true,
            });
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by boundary:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container size="md" py="xl">
                    <Stack align="center" gap="lg">
                        <Title order={1} style={{ color: '#8b7355', textAlign: 'center' }}>
                            Oops! Something went wrong
                        </Title>
                        <Text size="lg" ta="center">
                            We&apos;re sorry for the inconvenience. Please try refreshing the page.
                        </Text>
                        <Button
                            onClick={() => window.location.reload()}
                            size="lg"
                            style={{ backgroundColor: '#8b7355' }}
                        >
                            Refresh Page
                        </Button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <Paper withBorder p="md" w="100%" mt="xl">
                                <Title order={4} mb="sm">
                                    Error details (development only)
                                </Title>
                                <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {this.state.error.toString()}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </Code>
                            </Paper>
                        )}
                    </Stack>
                </Container>
            );
        }

        return this.props.children;
    }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
    return <ErrorBoundaryWithPostHog>{children}</ErrorBoundaryWithPostHog>;
}

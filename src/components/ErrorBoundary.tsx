'use client';

import { Component, ReactNode } from 'react';
import { usePostHog } from 'posthog-js/react';
import { Container, Title, Text, Button, Stack, Paper, Code } from '@mantine/core';
import { COLORS } from '@/constants';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    resetKey: number;
}

// Use centralized color constant (avoids SSR issues with useMantineTheme hook in class component)
const GOLD_COLOR = COLORS.gold;

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
        this.state = { hasError: false, error: null, resetKey: 0 };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
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
                        <Title order={1} style={{ color: GOLD_COLOR, textAlign: 'center' }}>
                            Oops! Something went wrong
                        </Title>
                        <Text size="lg" ta="center">
                            We&apos;re sorry for the inconvenience. Please try refreshing the page.
                        </Text>
                        <Button
                            onClick={() => this.setState(prev => ({
                                hasError: false,
                                error: null,
                                // Increment key to force React to remount children
                                // This prevents immediate re-errors from stale component state
                                resetKey: prev.resetKey + 1,
                            }))}
                            size="lg"
                            style={{ backgroundColor: GOLD_COLOR, marginRight: '0.5rem' }}
                        >
                            Try Again
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            size="lg"
                            variant="outline"
                            style={{ borderColor: GOLD_COLOR, color: GOLD_COLOR }}
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

        // Use resetKey to force remount of children after recovery
        // This prevents stale component state from causing immediate re-errors
        return <div key={this.state.resetKey}>{this.props.children}</div>;
    }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
    return <ErrorBoundaryWithPostHog>{children}</ErrorBoundaryWithPostHog>;
}

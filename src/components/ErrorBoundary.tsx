'use client';

import { Component, ReactNode } from 'react';
import { usePostHog } from 'posthog-js/react';

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
            // You can customize this error UI
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h1>Oops! Something went wrong</h1>
                    <p>We&apos;re sorry for the inconvenience. Please try refreshing the page.</p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                            <summary>Error details (development only)</summary>
                            <pre style={{ overflow: 'auto', padding: '1rem', background: '#f5f5f5' }}>
                                {this.state.error.toString()}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
    return <ErrorBoundaryWithPostHog>{children}</ErrorBoundaryWithPostHog>;
}

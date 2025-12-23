"use client";

import { Title, Text, Stack, Paper, Button, Box, Container, TextInput, Alert } from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconMail, IconCheck, IconX, IconAlertCircle } from "@tabler/icons-react";
import { Navigation } from "@/components/Navigation";
import { useTracking, RSVPEvents } from "@/hooks";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

export default function RSVPPage() {
    const [rsvpCode, setRsvpCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [validationState, setValidationState] = useState<ValidationState>("idle");
    const [validationMessage, setValidationMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    const { trackEvent } = useTracking();

    // Track page view on mount
    useEffect(() => {
        // Page view is tracked by PageViewTracker component
        trackEvent(RSVPEvents.CODE_ENTRY_VIEWED);
    }, [trackEvent]);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle code input with auto-uppercase and real-time validation
    const handleCodeChange = (value: string) => {
        // Convert to uppercase and remove any non-alphanumeric characters
        const cleaned = value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);
        setRsvpCode(cleaned);
        setError("");

        // Clear previous validation timeout
        if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
        }

        // Reset validation state for empty input
        if (cleaned.length === 0) {
            setValidationState("idle");
            setValidationMessage("");
            return;
        }

        // Show format hint while typing
        if (cleaned.length < 6) {
            setValidationState("idle");
            setValidationMessage(`${6 - cleaned.length} character${6 - cleaned.length > 1 ? "s" : ""} remaining`);
            return;
        }

        // Track code entry when 6 characters are entered
        trackEvent(RSVPEvents.CODE_ENTERED, {
            code_length: cleaned.length,
        });

        // Validate when 6 characters are entered (debounced)
        setValidationState("validating");
        setValidationMessage("Checking code...");

        validationTimeoutRef.current = setTimeout(async () => {
            const validationStartTime = performance.now();
            try {
                const response = await fetch(`/api/rsvp/validate/${cleaned}`);
                const validationDuration = Math.round(performance.now() - validationStartTime);

                if (response.ok) {
                    setValidationState("valid");
                    setValidationMessage("Code found! Click continue to proceed.");
                    // Track successful validation
                    trackEvent(RSVPEvents.CODE_VALIDATED, {
                        code: cleaned,
                        validation_time_ms: validationDuration,
                    });
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setValidationState("invalid");
                    setValidationMessage(
                        errorData.suggestion || "Code not found. Please check your invitation and try again."
                    );
                    // Track invalid code
                    trackEvent(RSVPEvents.CODE_INVALID, {
                        code_length: cleaned.length,
                        error_message: errorData.suggestion,
                        validation_time_ms: validationDuration,
                    });
                }
            } catch {
                const validationDuration = Math.round(performance.now() - validationStartTime);
                setValidationState("invalid");
                setValidationMessage("Unable to verify code. Please try again.");
                trackEvent(RSVPEvents.CODE_INVALID, {
                    code_length: cleaned.length,
                    error_type: 'network_error',
                    validation_time_ms: validationDuration,
                });
            }
        }, 500); // 500ms debounce
    };

    // Handle paste events
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("text");
        handleCodeChange(pastedText);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rsvpCode.trim()) {
            setError("Please enter your RSVP code");
            setValidationState("invalid");
            return;
        }

        if (rsvpCode.trim().length !== 6) {
            setError(`RSVP code must be exactly 6 characters (you entered ${rsvpCode.length})`);
            setValidationState("invalid");
            return;
        }

        // If already validated as valid, proceed immediately
        if (validationState === "valid") {
            router.push(`/rsvp/${rsvpCode.trim()}`);
            return;
        }

        setLoading(true);
        setError("");
        setValidationState("validating");
        setValidationMessage("Verifying code...");

        try {
            // Check if the RSVP code exists
            const response = await fetch(`/api/rsvp/validate/${rsvpCode.trim()}`);

            if (response.ok) {
                // Redirect to the RSVP form page
                router.push(`/rsvp/${rsvpCode.trim()}`);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.suggestion || "Invalid RSVP code. Please check and try again.");
                setValidationState("invalid");
                setValidationMessage(errorData.suggestion || "Code not found");
            }
        } catch {
            setError("Something went wrong. Please try again.");
            setValidationState("invalid");
            setValidationMessage("Unable to verify code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="sm" py="xl" className="fade-in">
                        <Stack gap="xl" align="center">
                            {/* Header */}
                            <Box style={{ textAlign: "center", marginBottom: "1rem" }}>
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
                                    RSVP
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                <Text size="lg" style={{ color: "var(--text-secondary)", lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
                                    Please enter your unique RSVP code to respond to our invitation. Your code can be
                                    found in your invitation. Alternatively, click the link in your invitation or scan
                                    the QR code to take you to your personalised link.
                                </Text>
                            </Box>

                            {/* RSVP Code Form */}
                            <Paper className="elegant-card" radius="lg" p="xl" style={{ width: "100%", maxWidth: "400px" }}>
                                <form onSubmit={handleSubmit}>
                                    <Stack gap="lg">
                                        <Box>
                                            <TextInput
                                                ref={inputRef}
                                                label="RSVP Code"
                                                placeholder="ABC123"
                                                description="Enter the 6-character code from your invitation"
                                                aria-label="RSVP Code - Enter the 6-character code from your invitation"
                                                value={rsvpCode}
                                                onChange={e => handleCodeChange(e.target.value)}
                                                onPaste={handlePaste}
                                                maxLength={6}
                                                size="lg"
                                                leftSection={<IconMail size={20} />}
                                                rightSection={
                                                    validationState === "valid" ? (
                                                        <IconCheck size={20} color="green" />
                                                    ) : validationState === "invalid" ? (
                                                        <IconX size={20} color="red" />
                                                    ) : null
                                                }
                                                error={error || (validationState === "invalid" ? validationMessage : undefined)}
                                                required
                                                style={{
                                                    textTransform: "uppercase",
                                                    fontFamily: "monospace",
                                                    letterSpacing: "0.1em",
                                                }}
                                                styles={{
                                                    input: {
                                                        borderColor:
                                                            validationState === "valid"
                                                                ? "var(--mantine-color-green-6)"
                                                                : validationState === "invalid"
                                                                ? "var(--mantine-color-red-6)"
                                                                : "rgba(139, 115, 85, 0.3)",
                                                        "&:focus": {
                                                            borderColor:
                                                                validationState === "valid"
                                                                    ? "var(--mantine-color-green-6)"
                                                                    : "var(--gold)",
                                                        },
                                                    },
                                                }}
                                            />
                                            {validationState === "validating" && (
                                                <Text size="xs" c="dimmed" mt={4}>
                                                    {validationMessage}
                                                </Text>
                                            )}
                                            {validationState === "valid" && (
                                                <Text size="xs" c="green" mt={4} fw={500}>
                                                    {validationMessage}
                                                </Text>
                                            )}
                                            {validationState === "idle" && validationMessage && (
                                                <Text size="xs" c="dimmed" mt={4}>
                                                    {validationMessage}
                                                </Text>
                                            )}
                                        </Box>

                                        {/* Format hint */}
                                        {rsvpCode.length === 0 && (
                                            <Alert
                                                icon={<IconAlertCircle size={16} />}
                                                color="blue"
                                                variant="light"
                                                radius="md"
                                            >
                                                <Text size="sm">
                                                    Your code is 6 characters long (letters and numbers only). Example:{" "}
                                                    <Text span fw={700} style={{ fontFamily: "monospace" }}>
                                                        ABC123
                                                    </Text>
                                                </Text>
                                            </Alert>
                                        )}

                                        <Button
                                            type="submit"
                                            size="lg"
                                            loading={loading || validationState === "validating"}
                                            disabled={rsvpCode.length !== 6 || validationState === "invalid"}
                                            className="primary-cta-button"
                                            style={{
                                                backgroundColor: "var(--gold)",
                                                color: "#ffffff",
                                                borderRadius: "8px",
                                                fontWeight: 500,
                                                letterSpacing: "0.02em",
                                            }}
                                            fullWidth
                                        >
                                            Continue to RSVP Form
                                        </Button>
                                    </Stack>
                                </form>
                            </Paper>

                            {/* Help Text */}
                            <Paper className="elegant-card" radius="md" p="md" style={{ backgroundColor: "rgba(250, 248, 245, 0.6)" }}>
                                <Text size="sm" style={{ color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7 }}>
                                    Your RSVP code can be found on your wedding invitation. If you need help, please
                                    contact us.
                                </Text>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

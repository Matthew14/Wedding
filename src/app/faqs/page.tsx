"use client";

import { Container, Title, Text, Stack, Box, Accordion, Loader, Alert } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

interface FAQ {
    id: string;
    question: string;
    answer: string;
    created_at?: string;
}

export default function FAQsPage() {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFAQs = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/faqs");
                if (!response.ok) throw new Error("Failed to fetch FAQs");
                const data = await response.json();
                setFaqs(data.faqs || []);
            } catch (err) {
                setError("Failed to load FAQs. Please try again later.");
                console.error("Error fetching FAQs:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFAQs();
    }, []);
    if (loading) {
        return (
            <>
                <Navigation />
                <main id="main-content">
                    <Box style={{ paddingTop: 56 }}>
                        <Container size="lg" py="xl">
                            <Stack gap="xl" align="center" style={{ paddingTop: "2rem" }}>
                                <Loader size="lg" style={{ color: "var(--gold)" }} />
                                <Text size="lg" style={{ color: "var(--text-secondary)" }}>
                                    Loading FAQs...
                                </Text>
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
                    <Container size="lg" py="xl" className="fade-in">
                        <Stack gap="xl">
                            <Box style={{ textAlign: "center", marginBottom: "3rem" }}>
                                <Title
                                    order={1}
                                    style={{
                                        color: "var(--text-primary)",
                                        marginBottom: "0",
                                        fontFamily: "var(--font-playfair), serif",
                                        fontSize: "clamp(2rem, 8vw, 3rem)",
                                        fontWeight: 400,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    Frequently Asked Questions
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                <Text size="xl" style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.8, fontSize: "1.125rem" }}>
                                    Find answers to common questions about our wedding day
                                </Text>
                            </Box>

                            {error && (
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="red"
                                    variant="light"
                                    style={{ marginBottom: "2rem" }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {faqs.length === 0 && !loading && !error ? (
                                <Box className="elegant-card" style={{ textAlign: "center", padding: "3rem", borderRadius: 12 }}>
                                    <Text size="lg" style={{ color: "var(--text-secondary)" }}>
                                        No FAQs available at the moment. Please check back later.
                                    </Text>
                                </Box>
                            ) : (
                                <Accordion
                                    variant="separated"
                                    radius="md"
                                    defaultValue={faqs.length > 0 ? faqs[0].id : undefined}
                                    styles={{
                                        item: {
                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                            border: "1px solid rgba(139, 115, 85, 0.1)",
                                            marginBottom: "1rem",
                                            boxShadow: "0 4px 16px rgba(139, 115, 85, 0.08)",
                                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                boxShadow: "0 8px 24px rgba(139, 115, 85, 0.12)",
                                                transform: "translateY(-2px)",
                                            },
                                        },
                                        control: {
                                            padding: "1.5rem",
                                            "&:hover": {
                                                backgroundColor: "rgba(139, 115, 85, 0.05)",
                                            },
                                        },
                                        label: {
                                            fontSize: "1.15rem",
                                            fontWeight: 500,
                                            color: "var(--text-primary)",
                                            fontFamily: "var(--font-geist-sans), sans-serif",
                                        },
                                        content: {
                                            padding: "1.5rem",
                                            paddingTop: 0,
                                        },
                                    }}
                                >
                                    {faqs.map(faq => (
                                        <Accordion.Item key={faq.id} value={faq.id}>
                                            <Accordion.Control>{faq.question}</Accordion.Control>
                                            <Accordion.Panel>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>{faq.answer}</Text>
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            )}

                            <Box
                                className="elegant-card"
                                style={{
                                    textAlign: "center",
                                    marginTop: "3rem",
                                    padding: "2.5rem",
                                    borderRadius: 12,
                                }}
                            >
                                <Title order={3} style={{ color: "var(--text-primary)", marginBottom: "1rem", fontFamily: "var(--font-playfair), serif", fontWeight: 400 }}>
                                    Still have questions?
                                </Title>
                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                                    Don&apos;t hesitate to reach out to us directly. We&apos;re here to help make sure
                                    you have everything you need for our special day!
                                </Text>
                            </Box>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

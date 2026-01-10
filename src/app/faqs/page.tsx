"use client";

import { Container, Title, Text, Stack, Box, Loader, Alert } from "@mantine/core";
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
                                <Loader size="lg" style={{ color: "var(--gold-dark)" }} />
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
                    <Container size="md" py="xl" className="fade-in">
                        <Stack gap="xl">
                            <Box style={{ textAlign: "center", marginBottom: "2rem" }}>
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
                                    FAQs
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
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
                                <Stack gap="lg">
                                    {faqs.map(faq => (
                                        <Box
                                            key={faq.id}
                                            style={{
                                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                                borderRadius: 12,
                                                boxShadow: "0 2px 12px rgba(139, 115, 85, 0.08)",
                                                padding: "1.5rem",
                                                borderLeft: "4px solid var(--gold-dark)",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: "1.1rem",
                                                    fontWeight: 500,
                                                    color: "var(--text-primary)",
                                                    lineHeight: 1.4,
                                                    marginBottom: "0.75rem",
                                                }}
                                            >
                                                {faq.question}
                                            </Text>
                                            <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1rem" }}>
                                                {faq.answer}
                                            </Text>
                                        </Box>
                                    ))}
                                </Stack>
                            )}

                            <Box
                                style={{
                                    textAlign: "center",
                                    marginTop: "2rem",
                                    padding: "2rem",
                                    backgroundColor: "rgba(139, 115, 85, 0.05)",
                                    borderRadius: 12,
                                }}
                            >
                                <Title order={3} style={{ color: "var(--text-primary)", marginBottom: "0.5rem", fontFamily: "var(--font-playfair), serif", fontWeight: 400, fontSize: "1.25rem" }}>
                                    Still have questions?
                                </Title>
                                <Text style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                                    Send us a message!
                                </Text>
                            </Box>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

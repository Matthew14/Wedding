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
                                <Loader size="lg" color="#8b7355" />
                                <Text size="lg" color="#6c757d">
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
                    <Container size="lg" py="xl">
                        <Stack gap="xl">
                            <Box style={{ textAlign: "center", marginBottom: "2rem" }}>
                                <Title
                                    order={1}
                                    size="3rem"
                                    style={{
                                        color: "#495057",
                                        marginBottom: "1rem",
                                        fontFamily: "serif",
                                    }}
                                >
                                    Frequently Asked Questions
                                </Title>
                                <Text size="lg" style={{ color: "#6c757d", maxWidth: 600, margin: "0 auto" }}>
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
                                <Box style={{ textAlign: "center", padding: "3rem" }}>
                                    <Text size="lg" color="#6c757d">
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
                                            border: "1px solid #e9ecef",
                                            marginBottom: "1rem",
                                        },
                                        control: {
                                            padding: "1.5rem",
                                            "&:hover": {
                                                backgroundColor: "#f8f9fa",
                                            },
                                        },
                                        label: {
                                            fontSize: "1.1rem",
                                            fontWeight: 500,
                                            color: "#495057",
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
                                                <Text style={{ color: "#6c757d", lineHeight: 1.6 }}>{faq.answer}</Text>
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            )}

                            <Box
                                style={{
                                    textAlign: "center",
                                    marginTop: "3rem",
                                    padding: "2rem",
                                    backgroundColor: "#ffffff",
                                    borderRadius: 8,
                                }}
                            >
                                <Title order={3} style={{ color: "#495057", marginBottom: "1rem" }}>
                                    Still have questions?
                                </Title>
                                <Text style={{ color: "#6c757d" }}>
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

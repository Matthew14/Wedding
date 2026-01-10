'use client';

import { Container, Title, Text, Stack, Box, Card, Group } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import { IconPlane } from "@tabler/icons-react";
import { travelCopy } from "./strings";

export default function LocationPage() {
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
                                        fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
                                        fontWeight: 400,
                                        lineHeight: 1.2,
                                        letterSpacing: "0.02em",
                                        hyphens: "none",
                                        wordBreak: "keep-all",
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    Location
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                <Text size="xl" style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.8, fontSize: "1.125rem" }}>
                                    Join us in Vilanova i la Geltrú to celebrate
                                </Text>
                            </Box>

                            {/* Google Maps Embed */}
                            <Box
                                className="elegant-card"
                                style={{
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    marginBottom: "2rem",
                                    border: "none",
                                }}
                            >
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000.3689009476025!2d1.70777487686561!3d41.235521605400095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a387a9b003ec95%3A0xe02f2753aeaf6066!2sGran%20Villa%20Rosa!5e0!3m2!1sen!2sie!4v1755797562369!5m2!1sen!2sie"
                                    width="100%"
                                    height="400"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Gran Villa Rosa Location Map"
                                    aria-label="Interactive map showing the location of Gran Villa Rosa wedding venue in Vilanova i la Geltrú, Spain"
                                />
                            </Box>

                            {/* Travel Information */}
                            <Card className="elegant-card" radius="md" p="xl">
                                <Group align="flex-start" gap="lg">
                                    <IconPlane size={32} color="#6d5a44" aria-hidden="true" />
                                    <Stack gap="sm" style={{ flex: 1 }}>
                                        <Title order={3} style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), serif", fontWeight: 400 }}>
                                            Getting There
                                        </Title>
                                        <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                                            <strong>Nearest Airport:</strong> Barcelona-El Prat Airport (BCN)
                                        </Text>
                                        <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                                            {travelCopy}
                                        </Text>
                                    </Stack>
                                </Group>
                            </Card>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

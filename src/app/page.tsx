import { Container, Title, Text, Button, Group, Stack, Box } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    {/* Hero Section */}
                    <Box
                        className="fade-in"
                        style={{
                            minHeight: "100vh",
                            display: "flex",
                            alignItems: "center",
                            position: "relative",
                        }}
                    >
                        <Container size="xl" style={{ textAlign: "center", zIndex: 1, padding: "0 1rem" }}>
                            <Stack gap="xl" align="center">
                                {/* Hero Image */}
                                <Box
                                    style={{
                                        width: "min(450px, 80vw)",
                                        height: "min(450px, 80vw)",
                                        maxWidth: "450px",
                                        maxHeight: "450px",
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        border: "3px solid var(--gold)",
                                        boxShadow: "0 12px 48px rgba(139, 115, 85, 0.25), 0 0 0 8px rgba(255, 255, 255, 0.9)",
                                        marginBottom: "1.5rem",
                                        position: "relative",
                                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                    }}
                                >
                                    <Image
                                        src="/rebecca-matthew-wedding-photo.jpeg"
                                        alt="Rebecca and Matthew, the couple getting married, in their engagement photo"
                                        fill
                                        sizes="(max-width: 768px) 80vw, 450px"
                                        style={{
                                            objectFit: "cover",
                                            objectPosition: "75% center",
                                        }}
                                        priority
                                    />
                                </Box>

                                <Title
                                    order={1}
                                    style={{
                                        fontSize: "clamp(2.5rem, 8vw, 4rem)",
                                        fontWeight: 400,
                                        color: "var(--text-primary)",
                                        marginBottom: "0",
                                        fontFamily: "var(--font-great-vibes), cursive",
                                        lineHeight: 1.2,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    Rebecca & Matthew
                                </Title>

                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>

                                <Title
                                    order={2}
                                    style={{
                                        fontSize: "clamp(1.3rem, 4vw, 1.75rem)",
                                        fontWeight: 300,
                                        color: "var(--gold-dark)",
                                        marginBottom: "0.5rem",
                                        fontFamily: "var(--font-great-vibes), cursive",
                                        letterSpacing: "0.05em",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    May, 2026
                                </Title>

                                <Text
                                    size="xl"
                                    style={{
                                        color: "var(--text-primary)",
                                        maxWidth: 600,
                                        lineHeight: 1.8,
                                        marginTop: "1rem",
                                        marginBottom: "2rem",
                                        fontSize: "1.125rem",
                                        fontFamily: "var(--font-geist-sans), sans-serif",
                                    }}
                                >
                                    Join us for our special day! You can find all the details you need on this website.
                                </Text>

                                <Group gap="lg" justify="center" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    <Button
                                        component={Link}
                                        href="/location"
                                        size="xl"
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
                                        View Location
                                    </Button>
                                    <Button
                                        component={Link}
                                        href="/faqs"
                                        size="xl"
                                        variant="outline"
                                        className="secondary-cta-button"
                                        style={{
                                            borderColor: "var(--gold-dark)",
                                            backgroundColor: "#ffffff",
                                            color: "var(--gold-dark)",
                                            borderRadius: 30,
                                            padding: "12px 30px",
                                            fontSize: "18px",
                                            fontWeight: 600,
                                            borderWidth: "2px",
                                            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        Read FAQs
                                    </Button>
                                </Group>
                            </Stack>
                        </Container>
                    </Box>
                </Box>
            </main>
        </>
    );
}

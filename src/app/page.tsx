import { Container, Title, Text, Stack, Box } from "@mantine/core";
import Image from "next/image";

export default function HomePage() {
    return (
        <main id="main-content">
            <Box
                className="fade-in"
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Container size="sm" style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <Stack gap="xl" align="center">
                        <Title
                            order={1}
                            style={{
                                fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
                                fontWeight: 400,
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-great-vibes), cursive",
                                lineHeight: 1.2,
                                letterSpacing: "0.02em",
                            }}
                        >
                            Thanks for celebrating with us
                        </Title>

                        <div className="decorative-divider" style={{ margin: "0.5rem auto" }}></div>

                        <Box
                            style={{
                                width: "min(400px, 80vw)",
                                height: "min(400px, 80vw)",
                                borderRadius: "50%",
                                border: "3px solid #8b7355",
                                boxShadow: "0 12px 48px rgba(139, 115, 85, 0.25), 0 0 0 8px rgba(255, 255, 255, 0.9)",
                                position: "relative",
                            }}
                        >
                            <Image
                                src="/rebecca-matthew-wedding-photo-2.jpeg"
                                alt="Rebecca and Matthew on their wedding day"
                                fill
                                sizes="(max-width: 768px) 80vw, 400px"
                                style={{
                                    objectFit: "cover",
                                    objectPosition: "center 90%",
                                    borderRadius: "50%",
                                }}
                                priority
                            />
                        </Box>

                        <Text
                            style={{
                                color: "var(--gold-dark)",
                                fontSize: "clamp(1.1rem, 3.5vw, 1.5rem)",
                                fontWeight: 400,
                                fontFamily: "var(--font-great-vibes), cursive",
                                letterSpacing: "0.05em",
                                lineHeight: 1.6,
                            }}
                        >
                            Check back soon to see the photos
                        </Text>
                    </Stack>
                </Container>
            </Box>
        </main>
    );
}

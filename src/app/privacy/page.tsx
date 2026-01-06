"use client";

import { Container, Title, Text, Stack, Box, List, Paper, Divider } from "@mantine/core";
import { Navigation } from "@/components/Navigation";

export default function PrivacyPolicyPage() {
    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="md" py="xl">
                        <Stack gap="xl" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
                            <Title order={1} style={{ color: "#8b7355", textAlign: "center" }}>
                                Privacy Policy
                            </Title>

                            <Text size="sm" c="dimmed" ta="center">
                                Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>

                            <Paper p="xl" withBorder>
                                <Stack gap="lg">
                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Introduction
                                        </Title>
                                        <Text>
                                            This website is used for managing RSVPs and sharing information about
                                            our wedding. We are committed to protecting your privacy and handling
                                            your data in an open and transparent manner.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Information We Collect
                                        </Title>
                                        <Text mb="sm">
                                            When you use this website, we may collect the following information:
                                        </Text>
                                        <List spacing="sm">
                                            <List.Item>
                                                <strong>RSVP Information:</strong> Names, attendance status, dietary
                                                requirements, accommodation preferences, song requests, travel plans,
                                                and any messages you provide
                                            </List.Item>
                                            <List.Item>
                                                <strong>Usage Data:</strong> Information about how you interact with
                                                our website, including pages visited, buttons clicked, and time spent
                                                on pages
                                            </List.Item>
                                            <List.Item>
                                                <strong>Technical Data:</strong> IP address, browser type, device
                                                information, and referring website (if applicable)
                                            </List.Item>
                                            <List.Item>
                                                <strong>Marketing Data:</strong> If you arrive via a link with
                                                tracking parameters (UTM codes), we collect information about the
                                                source of your visit
                                            </List.Item>
                                        </List>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            How We Use Your Information
                                        </Title>
                                        <Text mb="sm">We use the information we collect to:</Text>
                                        <List spacing="sm">
                                            <List.Item>Manage wedding RSVPs and plan accordingly</List.Item>
                                            <List.Item>Communicate with you about wedding details</List.Item>
                                            <List.Item>Accommodate dietary requirements and special requests</List.Item>
                                            <List.Item>Arrange accommodation and understand travel plans</List.Item>
                                            <List.Item>Improve the website experience through analytics</List.Item>
                                            <List.Item>Understand how guests interact with our website</List.Item>
                                        </List>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Analytics and Tracking
                                        </Title>
                                        <Text mb="sm">
                                            We use PostHog, a privacy-focused analytics platform, to understand how
                                            visitors use our website. This helps us improve the user experience.
                                        </Text>
                                        <Text mb="sm">PostHog may collect:</Text>
                                        <List spacing="sm">
                                            <List.Item>
                                                Pages you visit and how long you spend on them
                                            </List.Item>
                                            <List.Item>Buttons and links you click</List.Item>
                                            <List.Item>
                                                Form interactions (e.g., which fields you interact with)
                                            </List.Item>
                                            <List.Item>
                                                Session recordings with sensitive form inputs masked for privacy
                                            </List.Item>
                                            <List.Item>
                                                Performance data to help us optimize the website
                                            </List.Item>
                                        </List>
                                        <Text mt="sm">
                                            <strong>Important:</strong> Session recordings are configured to mask all
                                            form inputs for privacy. Only non-sensitive selections (like Yes/No for
                                            attendance) are visible in recordings.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Data Storage and Security
                                        </Title>
                                        <Text mb="sm">
                                            Your RSVP data is stored securely using Supabase, a trusted database
                                            provider. Analytics data is processed and stored by PostHog.
                                        </Text>
                                        <Text>
                                            We implement appropriate security measures to protect your personal
                                            information from unauthorized access, alteration, disclosure, or
                                            destruction.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Data Sharing
                                        </Title>
                                        <Text mb="sm">
                                            We do not sell, trade, or otherwise transfer your personal information
                                            to third parties. Your RSVP information is only shared with:
                                        </Text>
                                        <List spacing="sm">
                                            <List.Item>
                                                Wedding organizers (the couple getting married)
                                            </List.Item>
                                            <List.Item>
                                                Wedding venue and catering staff (only information necessary for
                                                their services)
                                            </List.Item>
                                        </List>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Your Rights
                                        </Title>
                                        <Text mb="sm">You have the right to:</Text>
                                        <List spacing="sm">
                                            <List.Item>
                                                Access the personal information we hold about you
                                            </List.Item>
                                            <List.Item>
                                                Request correction of any incorrect information
                                            </List.Item>
                                            <List.Item>
                                                Request deletion of your personal information
                                            </List.Item>
                                            <List.Item>
                                                Update your RSVP information at any time using your unique RSVP code
                                            </List.Item>
                                            <List.Item>
                                                Opt out of analytics tracking (contact us for assistance)
                                            </List.Item>
                                        </List>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Cookies and Local Storage
                                        </Title>
                                        <Text>
                                            This website may use cookies and browser local storage to enhance your
                                            experience and remember your preferences. Analytics cookies help us
                                            understand how visitors use the site.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Data Retention
                                        </Title>
                                        <Text>
                                            We will retain your RSVP information until after the wedding event.
                                            Analytics data may be retained for up to 12 months. After this period,
                                            or upon your request, we will securely delete your personal information.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Changes to This Policy
                                        </Title>
                                        <Text>
                                            We may update this privacy policy from time to time. Any changes will
                                            be posted on this page with an updated revision date.
                                        </Text>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Title order={2} size="h3" mb="sm" style={{ color: "#8b7355" }}>
                                            Contact Us
                                        </Title>
                                        <Text>
                                            If you have any questions about this privacy policy or how we handle
                                            your data, please contact us using the information provided in your
                                            wedding invitation.
                                        </Text>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

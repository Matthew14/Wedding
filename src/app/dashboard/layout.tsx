"use client";

import { Container, Tabs, Box, Anchor, Group, Title, Button } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const { signOut, loading } = useAuth();

    useEffect(() => {
        // Set active tab based on current path
        if (pathname.includes("/dashboard/faq-editor")) {
            setActiveTab("faq-editor");
        } else if (pathname.includes("/dashboard/invitations")) {
            setActiveTab("invitations");
        } else {
            setActiveTab("overview");
        }
    }, [pathname]);

    const handleTabChange = (value: string | null) => {
        if (value === "faq-editor") {
            router.push("/dashboard/faq-editor");
        } else if (value === "invitations") {
            router.push("/dashboard/invitations");
        } else if (value === "overview") {
            router.push("/dashboard");
        }
        setActiveTab(value);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    return (
        <>
            {/* Simple header with home link */}
            <Box
                style={{
                    borderBottom: "1px solid #e9ecef",
                    backgroundColor: "#ffffff",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    overflow: "visible",
                }}
            >
                <Container size="xl" style={{ padding: "1rem 1rem" }}>
                    <Group justify="space-between" align="center">
                        <Title
                            order={2}
                            style={{
                                fontWeight: 300,
                                color: "#495057",
                                fontFamily: "serif",
                                fontSize: "1.5rem",
                            }}
                        >
                            Wedding Dashboard
                        </Title>
                        <Group gap="md">
                            <Anchor
                                component={Link}
                                href="/"
                                style={{
                                    color: "#8b7355",
                                    textDecoration: "none",
                                    fontSize: "16px",
                                    fontWeight: 500,
                                }}
                            >
                                ← Back to Home
                            </Anchor>
                            <Button variant="subtle" color="red" onClick={handleSignOut} loading={loading} size="sm">
                                Sign Out
                            </Button>
                        </Group>
                    </Group>
                </Container>
            </Box>

            <main id="main-content">
                <Container size="xl" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        styles={{
                            tab: {
                                '&[dataActive="true"]': {
                                    backgroundColor: "#8b7355",
                                    color: "#ffffff",
                                    borderColor: "#8b7355",
                                },
                                "&:hover": {
                                    backgroundColor: "#f8f9fa",
                                    borderColor: "#8b7355",
                                },
                                '&:hover[dataActive="true"]': {
                                    backgroundColor: "#8b7355",
                                    color: "#ffffff",
                                    borderColor: "#8b7355",
                                },
                            },
                        }}
                    >
                        <Tabs.List>
                            <Tabs.Tab value="overview">Overview</Tabs.Tab>
                            <Tabs.Tab value="faq-editor">FAQ Editor</Tabs.Tab>
                            <Tabs.Tab value="invitations">Invitations</Tabs.Tab>
                        </Tabs.List>

                        <Box mt="lg">{children}</Box>
                    </Tabs>
                </Container>
            </main>
        </>
    );
}

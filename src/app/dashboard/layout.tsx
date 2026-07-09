"use client";

import { Container, Tabs, Box, Anchor, Group, Title, Button, Badge } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [signingOut, setSigningOut] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Fetched once per dashboard visit — the layout wraps every dashboard
    // page, so this must not refire on tab switches. Moderation actions
    // dispatch "wedding:photos-moderated" so the badge doesn't go stale.
    useEffect(() => {
        const fetchPendingCount = () => {
            fetch("/api/dashboard/photo-summary")
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => setPendingCount(data?.summary?.pending ?? 0))
                .catch(() => {}); // badge is best-effort
        };
        fetchPendingCount();
        window.addEventListener("wedding:photos-moderated", fetchPendingCount);
        return () => window.removeEventListener("wedding:photos-moderated", fetchPendingCount);
    }, []);

    useEffect(() => {
        if (pathname.includes("/dashboard/invitations")) {
            setActiveTab("invitations");
        } else if (pathname.includes("/dashboard/photos")) {
            setActiveTab("photos");
        } else {
            setActiveTab("overview");
        }
    }, [pathname]);

    const handleTabChange = (value: string | null) => {
        if (value === "invitations") {
            router.push("/dashboard/invitations");
        } else if (value === "photos") {
            router.push("/dashboard/photos");
        } else if (value === "overview") {
            router.push("/dashboard");
        }
        setActiveTab(value);
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <>
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
                            <Button variant="subtle" color="red" onClick={handleSignOut} loading={signingOut} size="sm">
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
                            },
                        }}
                    >
                        <Tabs.List>
                            <Tabs.Tab value="overview">Overview</Tabs.Tab>
                            <Tabs.Tab value="invitations">Invitations</Tabs.Tab>
                            <Tabs.Tab
                                value="photos"
                                rightSection={
                                    pendingCount > 0 ? (
                                        <Badge size="sm" circle color="orange" variant="filled">
                                            {pendingCount}
                                        </Badge>
                                    ) : undefined
                                }
                            >
                                Photos
                            </Tabs.Tab>
                        </Tabs.List>

                        <Box mt="lg">{children}</Box>
                    </Tabs>
                </Container>
            </main>
        </>
    );
}

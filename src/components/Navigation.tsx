"use client";

import { useState } from "react";
import { Container, Anchor, Button, Group, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGalleryFlag } from "@/hooks/useGalleryFlag";
import { useSession } from "@/hooks/useSession";
import { useTracking, SiteEvents } from "@/hooks/useTracking";
import classes from "./Navigation.module.css";

const navLinkStyle = {
    color: "var(--gold-dark)",
    textDecoration: "none",
    letterSpacing: "0.05em",
    transition: "opacity 0.2s",
} as const;

export function Navigation() {
    const galleryFlag = useGalleryFlag();
    const { status, refresh } = useSession();
    const { trackEvent } = useTracking();
    const trackNav = (target: string) => trackEvent(SiteEvents.NAV_CLICK, { target });
    const router = useRouter();
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);

    const handleLogout = async () => {
        setLoggingOut(true);
        setLogoutError(null);
        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (!res.ok) throw new Error(`Logout failed: ${res.status}`);
            await refresh();
            router.refresh();
        } catch {
            setLogoutError("Logout failed — please try again");
        } finally {
            setLoggingOut(false);
        }
    };

    // The dashboard has its own header (see src/app/dashboard/layout.tsx).
    if (pathname?.startsWith("/dashboard")) {
        return null;
    }

    // Keep the homepage headerless for guests until the gallery feature
    // flag is flipped; a logged-in admin always gets the nav.
    if (pathname === "/" && galleryFlag !== "on" && status !== "authenticated") {
        return null;
    }

    return (
        <header className={classes.header} role="banner">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            <Container size="lg" className={classes.inner}>
                <Anchor
                    component={Link}
                    href="/"
                    size="lg"
                    fw={400}
                    style={{
                        color: "var(--gold-dark)",
                        textDecoration: "none",
                        fontFamily: "var(--font-playfair), serif",
                        fontSize: "1.5rem",
                        letterSpacing: "0.02em",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onClick={() => trackNav("home")}
                >
                    Rebecca & Matthew
                </Anchor>
                <Group gap="md" wrap="nowrap">
                    {galleryFlag === "on" && (
                        <Anchor
                            component={Link}
                            href="/gallery"
                            size="sm"
                            fw={400}
                            style={navLinkStyle}
                            onClick={() => trackNav("gallery")}
                        >
                            Gallery
                        </Anchor>
                    )}
                    {status === "authenticated" && (
                        <>
                            {logoutError && (
                                <Text size="xs" c="red" role="alert">
                                    {logoutError}
                                </Text>
                            )}
                            <Anchor
                                component={Link}
                                href="/dashboard"
                                size="sm"
                                fw={400}
                                style={navLinkStyle}
                                onClick={() => trackNav("dashboard")}
                            >
                                Dashboard
                            </Anchor>
                            <Button
                                variant="subtle"
                                color="gray"
                                size="compact-sm"
                                onClick={() => {
                                    trackNav("logout");
                                    handleLogout();
                                }}
                                loading={loggingOut}
                            >
                                Logout
                            </Button>
                        </>
                    )}
                </Group>
            </Container>
        </header>
    );
}

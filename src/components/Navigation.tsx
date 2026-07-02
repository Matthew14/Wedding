"use client";

import { useState } from "react";
import { Container, Anchor, Button, Group } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGalleryFlag } from "@/hooks/useGalleryFlag";
import { useSession } from "@/hooks/useSession";
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
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            await refresh();
            router.refresh();
        } finally {
            setLoggingOut(false);
        }
    };

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
                >
                    Rebecca & Matthew
                </Anchor>
                <Group gap="md" wrap="nowrap">
                    {galleryFlag === "on" && (
                        <Anchor component={Link} href="/gallery" size="sm" fw={400} style={navLinkStyle}>
                            Gallery
                        </Anchor>
                    )}
                    {status === "authenticated" && (
                        <>
                            <Anchor component={Link} href="/dashboard" size="sm" fw={400} style={navLinkStyle}>
                                Dashboard
                            </Anchor>
                            <Button
                                variant="subtle"
                                color="gray"
                                size="compact-sm"
                                onClick={handleLogout}
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

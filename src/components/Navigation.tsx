"use client";

import { Container, Group, Burger, Paper, Transition, Anchor, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTracking, SiteEvents } from "@/hooks";
import classes from "./Navigation.module.css";

const links = [
    { link: "/location", label: "Location" },
    { link: "/schedule", label: "Schedule" },
    { link: "/faqs", label: "FAQs" },
    { link: "/rsvp", label: "RSVP" },
];

export function Navigation() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const pathname = usePathname();
    const { user } = useAuth();
    const { trackEvent } = useTracking();

    const handleNavClick = (label: string, link: string) => {
        trackEvent(SiteEvents.NAV_CLICK, {
            label,
            link,
            from_page: pathname,
        });
        close();
    };

    const items = links.map(link => (
        <Anchor
            component={Link}
            key={link.label}
            href={link.link}
            className={classes.link}
            data-active={pathname === link.link || undefined}
            onClick={() => handleNavClick(link.label, link.link)}
        >
            {link.label}
        </Anchor>
    ));

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
                        color: "var(--gold)",
                        textDecoration: "none",
                        fontFamily: "var(--font-playfair), serif",
                        fontSize: "1.5rem",
                        letterSpacing: "0.02em",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onClick={() => handleNavClick('Home', '/')}
                >
                    Rebecca & Matthew
                </Anchor>
                <nav role="navigation" aria-label="Main navigation">
                    <Group gap={5} visibleFrom="xs">
                        {items}
                        {user && (
                            <Button
                                component={Link}
                                href="/dashboard"
                                variant="filled"
                                color="#8b7355"
                                size="sm"
                                style={{
                                    backgroundColor: "var(--gold)",
                                    color: "#ffffff",
                                    textDecoration: "none",
                                    borderRadius: "6px",
                                    fontWeight: 500,
                                    letterSpacing: "0.02em",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                                onClick={() => handleNavClick('Dashboard', '/dashboard')}
                            >
                                Dashboard
                            </Button>
                        )}
                    </Group>
                </nav>

                <Burger
                    opened={opened}
                    onClick={toggle}
                    hiddenFrom="xs"
                    size="sm"
                    aria-label={opened ? "Close navigation menu" : "Open navigation menu"}
                    aria-expanded={opened}
                    aria-controls="mobile-navigation"
                />

                <Transition transition="pop-top-right" duration={200} mounted={opened}>
                    {styles => (
                        <Paper
                            className={classes.dropdown}
                            withBorder
                            style={styles}
                            id="mobile-navigation"
                            role="navigation"
                            aria-label="Mobile navigation menu"
                        >
                            {items}
                            {user && (
                                <Button
                                    component={Link}
                                    href="/dashboard"
                                    variant="filled"
                                    color="#8b7355"
                                    size="sm"
                                    fullWidth
                                    style={{
                                        backgroundColor: "var(--gold)",
                                        color: "#ffffff",
                                        textDecoration: "none",
                                        marginTop: "0.5rem",
                                        borderRadius: "6px",
                                        fontWeight: 500,
                                        letterSpacing: "0.02em",
                                    }}
                                    onClick={() => handleNavClick('Dashboard', '/dashboard')}
                                >
                                    Dashboard
                                </Button>
                            )}
                        </Paper>
                    )}
                </Transition>
            </Container>
        </header>
    );
}

"use client";

import { Container, Group, Burger, Paper, Transition, Anchor } from "@mantine/core";
import { useDisclosure, useFocusTrap } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTracking, SiteEvents } from "@/hooks";
import classes from "./Navigation.module.css";

const links = [
    { link: "/location", label: "Location" },
    { link: "/schedule", label: "Schedule" },
    { link: "/faqs", label: "FAQs" },
];

export function Navigation() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const pathname = usePathname();
    const { trackEvent } = useTracking();

    // Ref to burger button for returning focus on close
    const burgerRef = useRef<HTMLButtonElement>(null);

    // Focus trap for mobile menu - traps focus within menu while open
    const focusTrapRef = useFocusTrap(opened);

    // Close menu and return focus to burger button
    const closeMenu = useCallback(() => {
        close();
        // Return focus to burger button after menu closes
        setTimeout(() => burgerRef.current?.focus(), 0);
    }, [close]);

    // Handle escape key to close menu
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && opened) {
                closeMenu();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [opened, closeMenu]);

    const handleNavClick = (label: string, link: string) => {
        trackEvent(SiteEvents.NAV_CLICK, {
            label,
            link,
            from_page: pathname,
        });
        closeMenu();
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
                        color: "var(--gold-dark)",
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
                    </Group>
                </nav>

                <Burger
                    ref={burgerRef}
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
                            ref={focusTrapRef}
                            className={classes.dropdown}
                            withBorder
                            style={styles}
                            id="mobile-navigation"
                            role="navigation"
                            aria-label="Mobile navigation menu"
                        >
                            {items}
                        </Paper>
                    )}
                </Transition>
            </Container>
        </header>
    );
}

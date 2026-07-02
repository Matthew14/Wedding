"use client";

import { Container, Anchor } from "@mantine/core";
import Link from "next/link";
import { useGalleryFlag } from "@/hooks/useGalleryFlag";
import classes from "./Navigation.module.css";

export function Navigation() {
    const galleryFlag = useGalleryFlag();

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
                {galleryFlag === "on" && (
                    <Anchor
                        component={Link}
                        href="/gallery"
                        size="sm"
                        fw={400}
                        style={{
                            color: "var(--gold-dark)",
                            textDecoration: "none",
                            letterSpacing: "0.05em",
                            transition: "opacity 0.2s",
                        }}
                    >
                        Gallery
                    </Anchor>
                )}
            </Container>
        </header>
    );
}

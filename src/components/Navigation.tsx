"use client";

import { Container, Anchor } from "@mantine/core";
import Link from "next/link";
import classes from "./Navigation.module.css";

export function Navigation() {
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
            </Container>
        </header>
    );
}

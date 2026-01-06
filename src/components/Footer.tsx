"use client";

import { Container, Group, Anchor, Text } from "@mantine/core";
import Link from "next/link";
import { useTracking, SiteEvents } from "@/hooks";
import { usePathname } from "next/navigation";
import classes from "./Footer.module.css";

export function Footer() {
    const { trackEvent } = useTracking();
    const pathname = usePathname();

    const handleFooterClick = (label: string, link: string) => {
        trackEvent(SiteEvents.NAV_CLICK, {
            label: `Footer - ${label}`,
            link,
            from_page: pathname,
        });
    };

    return (
        <footer className={classes.footer}>
            <Container size="lg">
                <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                        © {new Date().getFullYear()} Rebecca & Matthew
                    </Text>
                    <Group gap="md">
                        <Anchor
                            component={Link}
                            href="/privacy"
                            size="sm"
                            c="dimmed"
                            className={classes.link}
                            onClick={() => handleFooterClick('Privacy Policy', '/privacy')}
                        >
                            Privacy Policy
                        </Anchor>
                    </Group>
                </Group>
            </Container>
        </footer>
    );
}

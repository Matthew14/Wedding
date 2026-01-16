"use client";

import { useSearchParams } from "next/navigation";
import { Button, Container, Box } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

export default function BackToInvitation() {
    const searchParams = useSearchParams();
    const fromSlug = searchParams.get("from");

    if (!fromSlug) {
        return null;
    }

    return (
        <Box
            style={{
                background: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
                padding: "1.5rem 0",
                borderBottom: "1px solid rgba(139, 115, 85, 0.1)",
            }}
        >
            <Container size="md">
                <Button
                    component="a"
                    href={`/invitation/${fromSlug}`}
                    variant="subtle"
                    leftSection={<IconArrowLeft size={18} />}
                    style={{
                        color: "var(--gold-dark)",
                        fontFamily: "var(--font-cormorant), serif",
                        fontSize: "1rem",
                        letterSpacing: "0.05em",
                    }}
                >
                    Back to invitation
                </Button>
            </Container>
        </Box>
    );
}

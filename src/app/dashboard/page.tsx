"use client";

import { Title, Text, Group, Stack, Paper, Box, SimpleGrid, Button, Alert, Badge } from "@mantine/core";
import { IconExternalLink, IconAlertCircle, IconPhoto } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SummaryData {
    invitations: { total: number; sent: number };
    rsvps: { total: number; received: number; accepted: number; declined: number };
    guests: { total: number; coming: number; notComing: number; undecided: number };
}

interface PhotoSummaryData {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
    recentUploads: number;
    byCategory: { id: string | null; name: string; count: number }[];
}

export default function DashboardPage() {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [photoSummary, setPhotoSummary] = useState<PhotoSummaryData | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const load = async (url: string) => {
            const r = await fetch(url);
            const data = await r.json();
            if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status})`);
            return data;
        };
        load("/api/dashboard/photo-summary")
            .then((data) => { if (data.summary) setPhotoSummary(data.summary); })
            .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load data"));
        load("/api/dashboard/summary")
            .then((data) => { if (data.summary) setSummary(data.summary); })
            .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load data"));
    }, []);

    return (
        <Stack gap="xl" align="center">
            <Box style={{ width: "100%", maxWidth: "900px" }}>
                <Title
                    order={1}
                    style={{
                        fontSize: "clamp(2rem, 6vw, 3rem)",
                        fontWeight: 300,
                        color: "#495057",
                        marginBottom: "1rem",
                        fontFamily: "serif",
                        textAlign: "center",
                    }}
                >
                    At a Glance
                </Title>

                <Group justify="center" mb="lg">
                    <Button
                        component="a"
                        href="https://docs.google.com/spreadsheets/d/1A9ML-7W_IiJPQraJMnF0HARA3qQBp1MGriPlm1GMUMU/edit"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="light"
                        color="#8b7355"
                        rightSection={<IconExternalLink size={16} />}
                    >
                        Planning Sheet
                    </Button>
                </Group>

                {fetchError && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="lg">
                        Failed to load summary: {fetchError}
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <Paper
                        shadow="md"
                        radius="lg"
                        p="lg"
                        style={{
                            backgroundColor:
                                photoSummary && photoSummary.pending > 0 ? "#fffbeb" : "#ffffff",
                        }}
                    >
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Pending Approvals
                        </Text>
                        <Text
                            fw={700}
                            style={{
                                fontSize: "3rem",
                                lineHeight: 1,
                                color:
                                    photoSummary && photoSummary.pending > 0 ? "#d97706" : "#22c55e",
                            }}
                        >
                            {photoSummary?.pending ?? "—"}
                        </Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            {photoSummary?.pending === 0
                                ? "All caught up"
                                : "guest photos waiting for review"}
                        </Text>
                        <Button
                            component={Link}
                            href="/dashboard/photos"
                            variant="light"
                            color="yellow"
                            size="sm"
                            mt="md"
                            leftSection={<IconPhoto size={16} />}
                        >
                            Review photos
                        </Button>
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Gallery
                        </Text>
                        <Group gap="xl">
                            <Box>
                                <Text size="xs" c="dimmed">Total</Text>
                                <Text fw={600} size="xl">{photoSummary?.total ?? "—"}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Approved</Text>
                                <Text fw={600} size="xl" style={{ color: "#22c55e" }}>
                                    {photoSummary?.approved ?? "—"}
                                </Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Rejected</Text>
                                <Text fw={600} size="xl" style={{ color: "#ef4444" }}>
                                    {photoSummary?.rejected ?? "—"}
                                </Text>
                            </Box>
                        </Group>
                        <Group gap="xs" mt="md">
                            <Badge variant="light" color="blue">
                                {photoSummary?.recentUploads ?? 0} upload
                                {photoSummary?.recentUploads !== 1 && "s"} in the last 7 days
                            </Badge>
                        </Group>
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Photos by Category
                        </Text>
                        {photoSummary && photoSummary.byCategory.length > 0 ? (
                            <Stack gap={6}>
                                {photoSummary.byCategory.map((c) => (
                                    <Group key={c.id ?? "uncategorised"} justify="space-between">
                                        <Text size="sm" c="dimmed">{c.name}</Text>
                                        <Text size="sm" fw={600}>{c.count}</Text>
                                    </Group>
                                ))}
                            </Stack>
                        ) : (
                            <Text size="sm" c="dimmed">No categories yet</Text>
                        )}
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            The Big Day
                        </Text>
                        <Stack gap={6}>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Invitations sent</Text>
                                <Text size="sm" fw={600}>
                                    {summary ? `${summary.invitations.sent} / ${summary.invitations.total}` : "—"}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">RSVPs accepted</Text>
                                <Text size="sm" fw={600} style={{ color: "#22c55e" }}>
                                    {summary?.rsvps.accepted ?? "—"}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">RSVPs declined</Text>
                                <Text size="sm" fw={600} style={{ color: "#ef4444" }}>
                                    {summary?.rsvps.declined ?? "—"}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Guests who joined us</Text>
                                <Text size="sm" fw={600}>
                                    {summary ? `${summary.guests.coming} / ${summary.guests.total}` : "—"}
                                </Text>
                            </Group>
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

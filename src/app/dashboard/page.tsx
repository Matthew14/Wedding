"use client";

import { Title, Text, Group, Stack, Paper, Box, SimpleGrid, Progress, Button } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface SummaryData {
    invitations: { total: number; sent: number };
    rsvps: { total: number; received: number; accepted: number; declined: number };
    guests: { total: number; coming: number; notComing: number; undecided: number };
    villa: { stayingYes: number; stayingNo: number; undecided: number };
}

export default function DashboardPage() {
    const [summary, setSummary] = useState<SummaryData>({
        invitations: { total: 0, sent: 0 },
        rsvps: { total: 0, received: 0, accepted: 0, declined: 0 },
        guests: { total: 0, coming: 0, notComing: 0, undecided: 0 },
        villa: { stayingYes: 0, stayingNo: 0, undecided: 0 },
    });

    useEffect(() => {
        fetch("/api/dashboard/summary")
            .then(r => r.json())
            .then(data => { if (data.summary) setSummary(data.summary); })
            .catch(err => console.error("Failed to fetch summary:", err));
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

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Invitations
                        </Text>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" c="dimmed">Sent</Text>
                            <Text fw={500}>{summary.invitations.sent} / {summary.invitations.total}</Text>
                        </Group>
                        <Progress
                            value={
                                summary.invitations.total > 0
                                    ? (summary.invitations.sent / summary.invitations.total) * 100
                                    : 0
                            }
                            color="#8b7355"
                            size="lg"
                            radius="md"
                        />
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            RSVPs
                        </Text>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" c="dimmed">Received</Text>
                            <Text fw={500}>{summary.rsvps.received} / {summary.rsvps.total}</Text>
                        </Group>
                        <Progress
                            value={
                                summary.rsvps.total > 0
                                    ? (summary.rsvps.received / summary.rsvps.total) * 100
                                    : 0
                            }
                            color="#3b82f6"
                            size="lg"
                            radius="md"
                            mb="md"
                        />
                        <Group gap="lg">
                            <Box>
                                <Text size="xs" c="dimmed">Accepted</Text>
                                <Text fw={600} style={{ color: "#22c55e" }}>{summary.rsvps.accepted}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Declined</Text>
                                <Text fw={600} style={{ color: "#ef4444" }}>{summary.rsvps.declined}</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Guests
                        </Text>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" c="dimmed">Confirmed</Text>
                            <Text fw={500}>{summary.guests.coming} / {summary.guests.total}</Text>
                        </Group>
                        <Progress.Root size="lg" radius="md">
                            <Progress.Section
                                value={
                                    summary.guests.total > 0
                                        ? (summary.guests.coming / summary.guests.total) * 100
                                        : 0
                                }
                                color="#22c55e"
                            />
                            <Progress.Section
                                value={
                                    summary.guests.total > 0
                                        ? (summary.guests.notComing / summary.guests.total) * 100
                                        : 0
                                }
                                color="#ef4444"
                            />
                        </Progress.Root>
                        <Group gap="lg" mt="md">
                            <Box>
                                <Text size="xs" c="dimmed">Coming</Text>
                                <Text fw={600} style={{ color: "#22c55e" }}>{summary.guests.coming}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Not Coming</Text>
                                <Text fw={600} style={{ color: "#ef4444" }}>{summary.guests.notComing}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Undecided</Text>
                                <Text fw={600} style={{ color: "#9ca3af" }}>{summary.guests.undecided}</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper shadow="md" radius="lg" p="lg" style={{ backgroundColor: "#ffffff" }}>
                        <Text fw={600} size="lg" mb="md" style={{ color: "#495057" }}>
                            Villa Accommodation
                        </Text>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" c="dimmed">Staying at Villa</Text>
                            <Text fw={500}>{summary.villa.stayingYes} parties</Text>
                        </Group>
                        <Progress.Root size="lg" radius="md">
                            <Progress.Section
                                value={
                                    summary.rsvps.total > 0
                                        ? (summary.villa.stayingYes / summary.rsvps.total) * 100
                                        : 0
                                }
                                color="#8b7355"
                            />
                            <Progress.Section
                                value={
                                    summary.rsvps.total > 0
                                        ? (summary.villa.stayingNo / summary.rsvps.total) * 100
                                        : 0
                                }
                                color="#6c757d"
                            />
                        </Progress.Root>
                        <Group gap="lg" mt="md">
                            <Box>
                                <Text size="xs" c="dimmed">Yes</Text>
                                <Text fw={600} style={{ color: "#8b7355" }}>{summary.villa.stayingYes}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">No</Text>
                                <Text fw={600} style={{ color: "#6c757d" }}>{summary.villa.stayingNo}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed">Undecided</Text>
                                <Text fw={600} style={{ color: "#9ca3af" }}>{summary.villa.undecided}</Text>
                            </Box>
                        </Group>
                    </Paper>
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

"use client";

import { Title, Text, Group, Stack, Paper, Box, SimpleGrid, Progress, Button } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryData {
    invitations: { total: number; sent: number };
    rsvps: { total: number; received: number; accepted: number; declined: number };
    guests: { total: number; coming: number; notComing: number; undecided: number };
    villa: { stayingYes: number; stayingNo: number; undecided: number };
}

export default function DashboardPage() {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    const [summary, setSummary] = useState<SummaryData>({
        invitations: { total: 0, sent: 0 },
        rsvps: { total: 0, received: 0, accepted: 0, declined: 0 },
        guests: { total: 0, coming: 0, notComing: 0, undecided: 0 },
        villa: { stayingYes: 0, stayingNo: 0, undecided: 0 },
    });

    const supabase = createClient();

    const fetchSummary = useCallback(async () => {
        try {
            // Fetch invitations
            const { data: invitations } = await supabase.from("invitation").select("*");

            // Fetch RSVPs
            const { data: rsvps } = await supabase.from("RSVPs").select("*");

            // Fetch invitees
            const { data: invitees } = await supabase.from("invitees").select("*");

            const invitationsData = invitations || [];
            const rsvpsData = rsvps || [];
            const inviteesData = invitees || [];

            setSummary({
                invitations: {
                    total: invitationsData.length,
                    sent: invitationsData.filter((i: { sent?: boolean }) => i.sent).length,
                },
                rsvps: {
                    total: rsvpsData.length,
                    received: rsvpsData.filter((r: { accepted?: boolean | null }) => r.accepted !== null).length,
                    accepted: rsvpsData.filter((r: { accepted?: boolean | null }) => r.accepted === true).length,
                    declined: rsvpsData.filter((r: { accepted?: boolean | null }) => r.accepted === false).length,
                },
                guests: {
                    total: inviteesData.length,
                    coming: inviteesData.filter((g: { coming?: boolean | null }) => g.coming === true).length,
                    notComing: inviteesData.filter((g: { coming?: boolean | null }) => g.coming === false).length,
                    undecided: inviteesData.filter((g: { coming?: boolean | null }) => g.coming === null).length,
                },
                villa: {
                    stayingYes: rsvpsData.filter(
                        (r: { staying_villa?: boolean | null }) => r.staying_villa === true
                    ).length,
                    stayingNo: rsvpsData.filter(
                        (r: { staying_villa?: boolean | null }) => r.staying_villa === false
                    ).length,
                    undecided: rsvpsData.filter(
                        (r: { staying_villa?: boolean | null }) => r.staying_villa === null
                    ).length,
                },
            });
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    }, [supabase]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        const weddingDate = new Date("2026-05-23T00:00:00");

        const timer = setInterval(() => {
            const now = new Date();
            const difference = weddingDate.getTime() - now.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatNumber = (num: number) => {
        return num.toString().padStart(2, "0");
    };

    return (
        <Stack gap="xl" align="center">
            {/* Data Summary Section */}
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
                    {/* Invitations Summary */}
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

                    {/* RSVPs Summary */}
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

                    {/* Guests Summary */}
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

                    {/* Villa Summary */}
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

            {/* Countdown Timer */}
            <Paper
                shadow="xl"
                radius="xl"
                p="xl"
                style={{
                    backgroundColor: "#ffffff",
                    border: "2px solid #f1f3f4",
                    minWidth: "600px",
                    maxWidth: "800px",
                }}
            >
                <Stack gap="xl" align="center">
                    <Title order={2} style={{ color: "#495057", fontFamily: "serif", marginBottom: "1rem" }}>
                        Time Remaining
                    </Title>

                    <Group gap="lg" justify="center" wrap="wrap">
                        {/* Days */}
                        <Box style={{ textAlign: "center", minWidth: "120px" }}>
                            <Paper
                                shadow="md"
                                radius="lg"
                                p="xl"
                                style={{
                                    backgroundColor: "#8b7355",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                                    {formatNumber(timeLeft.days)}
                                </Text>
                                <Text size="sm" fw={500} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
                                    Days
                                </Text>
                            </Paper>
                        </Box>

                        {/* Hours */}
                        <Box style={{ textAlign: "center", minWidth: "120px" }}>
                            <Paper
                                shadow="md"
                                radius="lg"
                                p="xl"
                                style={{
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                                    {formatNumber(timeLeft.hours)}
                                </Text>
                                <Text size="sm" fw={500} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
                                    Hours
                                </Text>
                            </Paper>
                        </Box>

                        {/* Minutes */}
                        <Box style={{ textAlign: "center", minWidth: "120px" }}>
                            <Paper
                                shadow="md"
                                radius="lg"
                                p="xl"
                                style={{
                                    backgroundColor: "#22c55e",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                                    {formatNumber(timeLeft.minutes)}
                                </Text>
                                <Text size="sm" fw={500} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
                                    Minutes
                                </Text>
                            </Paper>
                        </Box>

                        {/* Seconds */}
                        <Box style={{ textAlign: "center", minWidth: "120px" }}>
                            <Paper
                                shadow="md"
                                radius="lg"
                                p="xl"
                                style={{
                                    backgroundColor: "#ef4444",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                                    {formatNumber(timeLeft.seconds)}
                                </Text>
                                <Text size="sm" fw={500} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
                                    Seconds
                                </Text>
                            </Paper>
                        </Box>
                    </Group>
                </Stack>
            </Paper>
        </Stack>
    );
}

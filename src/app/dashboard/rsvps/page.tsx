"use client";

import {
    Title,
    Text,
    Group,
    Stack,
    Box,
    Paper,
    Table,
    Badge,
    LoadingOverlay,
} from "@mantine/core";
import { IconCheck, IconX, IconQuestionMark } from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface Invitee {
    id: string;
    first_name: string;
    last_name: string;
    coming: boolean | null;
}

interface RSVPWithInvitees {
    id: string;
    invitation_id: string;
    short_url: string;
    accepted: boolean | null;
    staying_villa: boolean | null;
    dietary_restrictions: string | null;
    song_request: string | null;
    travel_plans: string | null;
    message: string | null;
    updated_at: string | null;
    invitees: Invitee[];
}

export default function RSVPsPage() {
    const [rsvps, setRsvps] = useState<RSVPWithInvitees[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch RSVPs with invitees in a single query using Supabase join
            const { data: rsvpsData, error: rsvpsError } = await supabase
                .from("RSVPs")
                .select(`
                    id,
                    invitation_id,
                    short_url,
                    accepted,
                    staying_villa,
                    dietary_restrictions,
                    song_request,
                    travel_plans,
                    message,
                    updated_at,
                    invitation:invitation_id (
                        invitees (
                            id,
                            first_name,
                            last_name,
                            coming
                        )
                    )
                `)
                .order("updated_at", { ascending: false, nullsFirst: false });

            if (rsvpsError) throw rsvpsError;

            // Transform data to flatten invitees from nested structure
            const transformedData: RSVPWithInvitees[] = (rsvpsData || []).map(rsvp => {
                const invitation = rsvp.invitation;
                let invitees: Invitee[] = [];

                if (invitation && typeof invitation === 'object' && !Array.isArray(invitation)) {
                    const inv = invitation as { invitees?: Invitee[] };
                    invitees = Array.isArray(inv.invitees) ? inv.invitees : [];
                }

                return {
                    id: rsvp.id,
                    invitation_id: rsvp.invitation_id,
                    short_url: rsvp.short_url,
                    accepted: rsvp.accepted,
                    staying_villa: rsvp.staying_villa,
                    dietary_restrictions: rsvp.dietary_restrictions,
                    song_request: rsvp.song_request,
                    travel_plans: rsvp.travel_plans,
                    message: rsvp.message,
                    updated_at: rsvp.updated_at,
                    invitees,
                };
            });

            setRsvps(transformedData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getGuestNames = (invitees: Invitee[]) => {
        if (invitees.length === 0) return "No guests";
        return invitees.map(g => g.first_name).join(" & ");
    };

    const isRsvpReceived = (rsvp: RSVPWithInvitees) => {
        return rsvp.accepted !== null;
    };

    const receivedCount = rsvps.filter(isRsvpReceived).length;
    const acceptedCount = rsvps.filter(r => r.accepted === true).length;
    const declinedCount = rsvps.filter(r => r.accepted === false).length;
    const pendingCount = rsvps.filter(r => r.accepted === null).length;

    const StatusIcon = ({ value }: { value: boolean | null }) => {
        if (value === true) return <IconCheck size={16} style={{ color: "#22c55e" }} />;
        if (value === false) return <IconX size={16} style={{ color: "#ef4444" }} />;
        return <IconQuestionMark size={16} style={{ color: "#9ca3af" }} />;
    };

    return (
        <Stack gap="xl">
            <Box style={{ textAlign: "center" }}>
                <Title
                    order={2}
                    style={{
                        fontSize: "clamp(1.8rem, 5vw, 2.2rem)",
                        fontWeight: 300,
                        color: "#495057",
                        marginBottom: "0.5rem",
                        fontFamily: "serif",
                    }}
                >
                    RSVP Responses
                </Title>
                <Text size="lg" style={{ color: "#6c757d" }}>
                    Track guest responses and details
                </Text>
            </Box>

            {/* Summary Cards */}
            <Group justify="center" gap="lg">
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#3b82f6">
                        {rsvps.length}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Total RSVPs
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#22c55e">
                        {receivedCount}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Received
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#22c55e">
                        {acceptedCount}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Accepted
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#ef4444">
                        {declinedCount}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Declined
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#9ca3af">
                        {pendingCount}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Pending
                    </Text>
                </Paper>
            </Group>

            <LoadingOverlay visible={loading} />

            {/* RSVPs Table */}
            <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: "#ffffff" }}>
                <Title order={3} mb="lg" style={{ color: "#495057", textAlign: "center" }}>
                    All Responses
                </Title>
                <Box style={{ overflowX: "auto" }}>
                    <Table striped highlightOnHover>
                        <thead>
                            <tr>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Invitation
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Who&apos;s Coming
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057", textAlign: "center" }}>
                                    Code
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057", textAlign: "center" }}>
                                    Received
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057", textAlign: "center" }}>
                                    Attending
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057", textAlign: "center" }}>
                                    Villa
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Dietary
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Song
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Travel
                                </th>
                                <th style={{ padding: "16px 12px", fontWeight: 600, color: "#495057" }}>
                                    Message
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rsvps.map((rsvp, index) => {
                                const received = isRsvpReceived(rsvp);
                                return (
                                    <tr
                                        key={rsvp.id}
                                        style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f9fa" }}
                                    >
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Text fw={500}>{getGuestNames(rsvp.invitees)}</Text>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Stack gap={4}>
                                                {rsvp.invitees.map(guest => (
                                                    <Group key={guest.id} gap="xs">
                                                        <StatusIcon value={guest.coming} />
                                                        <Text size="sm" c={guest.coming === null ? "dimmed" : undefined}>
                                                            {guest.first_name}
                                                        </Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle", textAlign: "center" }}>
                                            <Badge variant="light" color="gray" size="sm">
                                                {rsvp.short_url}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle", textAlign: "center" }}>
                                            <Badge
                                                color={received ? "green" : "gray"}
                                                variant="light"
                                            >
                                                {received ? "Yes" : "No"}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle", textAlign: "center" }}>
                                            <StatusIcon value={rsvp.accepted} />
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle", textAlign: "center" }}>
                                            <StatusIcon value={rsvp.staying_villa} />
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Text size="sm" c="dimmed" lineClamp={2} style={{ maxWidth: 150 }}>
                                                {rsvp.dietary_restrictions || "-"}
                                            </Text>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Text size="sm" c="dimmed" lineClamp={2} style={{ maxWidth: 150 }}>
                                                {rsvp.song_request || "-"}
                                            </Text>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Text size="sm" c="dimmed" lineClamp={2} style={{ maxWidth: 150 }}>
                                                {rsvp.travel_plans || "-"}
                                            </Text>
                                        </td>
                                        <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                                            <Text size="sm" c="dimmed" lineClamp={2} style={{ maxWidth: 150 }}>
                                                {rsvp.message || "-"}
                                            </Text>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Box>
            </Paper>
        </Stack>
    );
}

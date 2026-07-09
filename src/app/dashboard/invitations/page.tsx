"use client";

import {
    Title,
    Text,
    Group,
    Stack,
    Box,
    Paper,
    Button,
    Table,
    Badge,
    LoadingOverlay,
} from "@mantine/core";
import { IconCopy, IconCheck, IconUser } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface InvitationCode {
    code: string;
    invitation_id: number;
    is_matthew_side: boolean;
    invitee_names: string[];
}

export default function InvitationsPage() {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dashboard/invitation-codes")
            .then(r => r.json())
            .then(data => { if (data.codes) setCodes(data.codes); })
            .catch(err => console.error("Failed to fetch invitation codes:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleCopy = async (code: string) => {
        const url = `${window.location.origin}/gallery?code=${code}`;
        await navigator.clipboard.writeText(url);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
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
                    Photo Gallery Codes
                </Title>
                <Text size="lg" style={{ color: "#6c757d" }}>
                    Photo upload access codes for each invitation
                </Text>
            </Box>

            <Group justify="center" gap="lg">
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} style={{ color: "#22c55e" }}>{codes.length}</Text>
                    <Text size="sm" style={{ color: "#6c757d" }}>Total Codes</Text>
                </Paper>
            </Group>

            <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: "#ffffff", position: "relative" }}>
                <LoadingOverlay visible={loading} />
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ textAlign: "center", fontWeight: 600, color: "#495057" }}>Code</Table.Th>
                            <Table.Th style={{ textAlign: "center", fontWeight: 600, color: "#495057" }}>Invitation</Table.Th>
                            <Table.Th style={{ textAlign: "center", fontWeight: 600, color: "#495057" }}>Side</Table.Th>
                            <Table.Th style={{ fontWeight: 600, color: "#495057" }}>Guests</Table.Th>
                            <Table.Th style={{ textAlign: "center", fontWeight: 600, color: "#495057" }}>Copy Gallery Link</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {codes.map(item => (
                            <Table.Tr key={item.code}>
                                <Table.Td style={{ textAlign: "center" }}>
                                    <Text ff="monospace" fw={600}>{item.code}</Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: "center" }}>
                                    <Text fw={500}>#{item.invitation_id}</Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: "center" }}>
                                    <Badge
                                        color={item.is_matthew_side ? "blue" : "pink"}
                                        variant="light"
                                    >
                                        {item.is_matthew_side ? "Matthew's" : "Rebecca's"}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Stack gap={4}>
                                        {item.invitee_names.map(name => (
                                            <Group key={name} gap="xs">
                                                <IconUser size={14} style={{ color: "#8b7355" }} />
                                                <Text size="sm" c="dimmed">{name}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Table.Td>
                                <Table.Td style={{ textAlign: "center" }}>
                                    <Button
                                        variant="subtle"
                                        color={copied === item.code ? "green" : "#8b7355"}
                                        size="xs"
                                        onClick={() => handleCopy(item.code)}
                                    >
                                        {copied === item.code ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </Button>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Paper>
        </Stack>
    );
}

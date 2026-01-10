"use client";

import {
    Title,
    Text,
    Group,
    Stack,
    Box,
    Paper,
    Button,
    Checkbox,
    Table,
    Modal,
    Badge,
    Alert,
    LoadingOverlay,
    MultiSelect,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconUser, IconExternalLink } from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface Invitation {
    id: string;
    created_at: string;
    isMatthewSide: boolean;
    sent: boolean;
}

interface RSVP {
    id: string;
    invitation_id: string;
    short_url: string;
}

interface Invitee {
    id: string;
    created_at: string;
    first_name: string;
    last_name: string;
    invitation_id: string | null;
}

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [invitees, setInvitees] = useState<Invitee[]>([]);
    const [rsvps, setRsvps] = useState<RSVP[]>([]);
    const [loading, setLoading] = useState(true);
    const [opened, { open, close }] = useDisclosure(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const supabase = createClient();

    const showAlert = (type: "success" | "error", message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000); // Auto-hide after 5 seconds
    };

    const validateInvitationForm = () => {
        const errors: { [key: string]: string } = {};
        if (invitationForm.isMatthewSide === undefined) {
            errors.isMatthewSide = "Please select a side";
        }
        setInvitationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetInvitationForm = () => {
        setInvitationForm({ isMatthewSide: true, selectedInvitees: [] });
        setInvitationErrors({});
    };

    const [invitationForm, setInvitationForm] = useState({
        isMatthewSide: true,
        selectedInvitees: [] as string[],
    });

    const [invitationErrors, setInvitationErrors] = useState<{ [key: string]: string }>({});

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch invitations
            const { data: invitationsData, error: invitationsError } = await supabase
                .from("invitation")
                .select("*")
                .order("created_at", { ascending: false });

            if (invitationsError) throw invitationsError;

            // Fetch invitees
            const { data: inviteesData, error: inviteesError } = await supabase
                .from("invitees")
                .select("*")
                .order("created_at", { ascending: false });

            if (inviteesError) throw inviteesError;

            // Fetch RSVPs
            const { data: rsvpsData, error: rsvpsError } = await supabase
                .from("RSVPs")
                .select("id, invitation_id, short_url");

            if (rsvpsError) throw rsvpsError;

            setInvitations(invitationsData || []);
            setInvitees(inviteesData || []);
            setRsvps(rsvpsData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            showAlert("error", "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateInvitation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateInvitationForm()) {
            return;
        }

        try {
            // Create the invitation first
            const { data: invitationData, error: invitationError } = await supabase
                .from("invitation")
                .insert([{ isMatthewSide: invitationForm.isMatthewSide }])
                .select()
                .single();

            if (invitationError) throw invitationError;

            // If there are selected invitees, associate them with the new invitation
            if (invitationForm.selectedInvitees.length > 0) {
                const { error: associationError } = await supabase
                    .from("invitees")
                    .update({ invitation_id: invitationData.id })
                    .in("id", invitationForm.selectedInvitees);

                if (associationError) throw associationError;
            }

            showAlert(
                "success",
                `Invitation created successfully${invitationForm.selectedInvitees.length > 0 ? ` with ${invitationForm.selectedInvitees.length} invitee(s)` : ""}`
            );

            resetInvitationForm();
            close();
            fetchData();
        } catch (error) {
            console.error("Error creating invitation:", error);
            showAlert("error", "Failed to create invitation");
        }
    };

    const getInviteesForInvitation = (invitationId: string) => {
        return invitees.filter(invitee => invitee.invitation_id === invitationId);
    };

    const getUnassignedInvitees = () => {
        return invitees.filter(invitee => invitee.invitation_id === null);
    };

    const getRsvpForInvitation = (invitationId: string) => {
        return rsvps.find(rsvp => rsvp.invitation_id === invitationId);
    };

    const getInvitationLink = (invitationId: string) => {
        const associatedInvitees = getInviteesForInvitation(invitationId);
        const rsvp = getRsvpForInvitation(invitationId);

        if (!rsvp || associatedInvitees.length === 0) {
            return null;
        }

        const names = associatedInvitees.map(i => i.first_name.toLowerCase()).join("-");
        return `/invitation/${names}-${rsvp.short_url}`;
    };

    const handleSentToggle = async (invitationId: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from("invitation")
                .update({ sent: !currentValue })
                .eq("id", invitationId);

            if (error) throw error;

            // Update local state
            setInvitations(prev =>
                prev.map(inv => (inv.id === invitationId ? { ...inv, sent: !currentValue } : inv))
            );
        } catch (error) {
            console.error("Error updating sent status:", error);
            showAlert("error", "Failed to update sent status");
        }
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
                    Invitations Management
                </Title>
                <Text size="lg" style={{ color: "#6c757d" }}>
                    Create invitations and manage guest associations
                </Text>
            </Box>

            {/* Alert Messages */}
            {alert && (
                <Alert
                    color={alert.type === "success" ? "green" : "red"}
                    title={alert.type === "success" ? "Success" : "Error"}
                    onClose={() => setAlert(null)}
                    withCloseButton
                >
                    {alert.message}
                </Alert>
            )}

            {/* Action Buttons */}
            <Group justify="center" gap="lg">
                <Button leftSection={<IconPlus size={16} />} onClick={open} variant="filled" color="#8b7355" size="lg">
                    Create Invitation
                </Button>
            </Group>

            {/* Summary Cards */}
            <Group justify="center" gap="lg">
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#22c55e">
                        {invitations.length}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Total Invitations
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#3b82f6">
                        {invitees.length}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Total Invitees
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#8b7355">
                        {invitees.filter(i => i.invitation_id !== null).length}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Assigned
                    </Text>
                </Paper>
                <Paper shadow="sm" radius="md" p="md" style={{ textAlign: "center", minWidth: 120 }}>
                    <Text size="xl" fw={700} color="#ef4444">
                        {getUnassignedInvitees().length}
                    </Text>
                    <Text size="sm" color="#6c757d">
                        Unassigned
                    </Text>
                </Paper>
            </Group>

            <LoadingOverlay visible={loading} />

            {/* Invitations Table */}
            <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: "#ffffff" }}>
                <Title order={3} mb="lg" style={{ color: "#495057", textAlign: "center" }}>
                    Invitations
                </Title>
                <Table striped highlightOnHover>
                    <thead>
                        <tr>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                ID
                            </th>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                Side
                            </th>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                Invitees
                            </th>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                Link
                            </th>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                Sent
                            </th>
                            <th
                                style={{ textAlign: "center", padding: "16px 12px", fontWeight: 600, color: "#495057" }}
                            >
                                RSVP
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.map((invitation, index) => {
                            const associatedInvitees = getInviteesForInvitation(invitation.id);

                            return (
                                <tr
                                    key={invitation.id}
                                    style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8f9fa" }}
                                >
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        <Text fw={600} size="lg">
                                            #{invitation.id}
                                        </Text>
                                    </td>
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        <Badge
                                            color={invitation.isMatthewSide ? "blue" : "pink"}
                                            variant="light"
                                            size="lg"
                                            style={{ padding: "8px 16px", fontSize: "14px" }}
                                        >
                                            {invitation.isMatthewSide ? "Matthew's Side" : "Rebecca's Side"}
                                        </Badge>
                                    </td>
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        {associatedInvitees.length > 0 ? (
                                            <Stack
                                                gap="md"
                                                align="center"
                                                style={{ minHeight: "60px", justifyContent: "center" }}
                                            >
                                                {associatedInvitees.map(invitee => (
                                                    <Group
                                                        key={invitee.id}
                                                        gap="sm"
                                                        justify="center"
                                                        style={{ width: "100%" }}
                                                    >
                                                        <IconUser
                                                            size={16}
                                                            style={{ color: "#8b7355", flexShrink: 0 }}
                                                        />
                                                        <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                                                            {invitee.first_name} {invitee.last_name}
                                                        </Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Text
                                                size="sm"
                                                c="dimmed"
                                                style={{ fontStyle: "italic", padding: "20px 0" }}
                                            >
                                                No invitees assigned
                                            </Text>
                                        )}
                                    </td>
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        {(() => {
                                            const link = getInvitationLink(invitation.id);
                                            return link ? (
                                                <Button
                                                    component="a"
                                                    href={link}
                                                    target="_blank"
                                                    variant="subtle"
                                                    color="#8b7355"
                                                    size="sm"
                                                    leftSection={<IconExternalLink size={14} />}
                                                >
                                                    View
                                                </Button>
                                            ) : (
                                                <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                                                    No RSVP
                                                </Text>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        <Checkbox
                                            checked={invitation.sent}
                                            onChange={() => handleSentToggle(invitation.id, invitation.sent)}
                                            color="#8b7355"
                                            size="md"
                                            style={{ display: "flex", justifyContent: "center" }}
                                        />
                                    </td>
                                    <td style={{ textAlign: "center", padding: "20px 12px", verticalAlign: "middle" }}>
                                        <Button
                                            variant="outline"
                                            color="#8b7355"
                                            size="sm"
                                            onClick={() => {
                                                // TODO: Implement RSVP drill-down functionality
                                                console.log(`Drill down to RSVP for invitation #${invitation.id}`);
                                            }}
                                            style={{ minWidth: "80px" }}
                                        >
                                            View RSVP
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Paper>

            {/* Create Invitation Modal */}
            <Modal opened={opened} onClose={close} title="Create New Invitation" size="lg">
                <form onSubmit={handleCreateInvitation}>
                    <Stack gap="md">
                        <Checkbox
                            label="Is this invitation for Matthew's side of the family?"
                            checked={invitationForm.isMatthewSide}
                            onChange={event =>
                                setInvitationForm(prev => ({ ...prev, isMatthewSide: event.currentTarget.checked }))
                            }
                            error={invitationErrors.isMatthewSide}
                        />

                        <MultiSelect
                            label="Select Invitees (Optional)"
                            placeholder="Choose invitees to associate with this invitation"
                            data={invitees
                                .filter(invitee => invitee.invitation_id === null) // Only show unassigned invitees
                                .map(invitee => ({
                                    value: invitee.id.toString(),
                                    label: `${invitee.first_name} ${invitee.last_name}`,
                                }))}
                            value={invitationForm.selectedInvitees}
                            onChange={values =>
                                setInvitationForm(prev => ({
                                    ...prev,
                                    selectedInvitees: values,
                                }))
                            }
                            searchable
                            clearable
                        />

                        {(() => {
                            const unassignedCount = invitees.filter(invitee => invitee.invitation_id === null).length;
                            return unassignedCount === 0 ? (
                                <Alert color="blue" variant="light">
                                    <Text size="sm">
                                        All invitees are already assigned. Create the invitation first and assign
                                        invitees later.
                                    </Text>
                                </Alert>
                            ) : (
                                <Text size="sm" c="dimmed">
                                    Only unassigned invitees are shown. You can assign more invitees later.
                                </Text>
                            );
                        })()}

                        <Group justify="flex-end" mt="md">
                            <Button variant="outline" onClick={close}>
                                Cancel
                            </Button>
                            <Button type="submit" color="#8b7355">
                                Create Invitation
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}

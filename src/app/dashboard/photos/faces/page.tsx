"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Stack,
    Title,
    Text,
    Tabs,
    SimpleGrid,
    Paper,
    Group,
    Button,
    Select,
    Badge,
    Alert,
    Loader,
    Center,
    Anchor,
    Modal,
    Tooltip,
    ActionIcon,
    UnstyledButton,
} from "@mantine/core";
import { IconAlertCircle, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { FaceCrop } from "@/components/FaceCrop";
import type {
    ClusterSummary,
    ClustersResponse,
    ClusterDetailResponse,
    FaceView,
} from "@/types/faces";
import type { InviteeSummary } from "@/utils/db/archive";

type FilterTab = "unassigned" | "assigned" | "ignored" | "by-person";

function clusterTab(cluster: ClusterSummary): FilterTab {
    if (cluster.ignored) return "ignored";
    if (cluster.invitee_id != null) return "assigned";
    return "unassigned";
}

export default function FacesPage() {
    const [clusters, setClusters] = useState<ClusterSummary[]>([]);
    const [unclusteredFaces, setUnclusteredFaces] = useState(0);
    const [invitees, setInvitees] = useState<InviteeSummary[]>([]);
    const [activeTab, setActiveTab] = useState<FilterTab>("unassigned");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<ClusterDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    // Monotonic id per detail fetch: closing the modal (or opening another
    // cluster) bumps it, so a stale response can neither reopen a dismissed
    // modal nor overwrite a newer cluster's data.
    const detailRequestId = useRef(0);

    const fetchClusters = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/dashboard/faces/clusters");
            if (!res.ok) throw new Error("Failed to load face clusters");
            const data: ClustersResponse = await res.json();
            setClusters(data.clusters ?? []);
            setUnclusteredFaces(data.progress?.unclustered_faces ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load face clusters");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClusters();
        fetch("/api/dashboard/faces/invitees")
            .then((r) => r.json())
            .then((d) => setInvitees(d.invitees ?? []))
            .catch(() => {});
    }, [fetchClusters]);

    const patchCluster = async (
        clusterId: string,
        body: { invitee_id: number | null } | { ignored: true }
    ) => {
        try {
            const res = await fetch(`/api/dashboard/faces/clusters/${clusterId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Update failed");
            setClusters((prev) =>
                prev.map((c) => {
                    if (c.cluster_id !== clusterId) return c;
                    if ("ignored" in body) {
                        return { ...c, ignored: true, invitee_id: null, invitee_name: null };
                    }
                    if (body.invitee_id === null) {
                        return { ...c, ignored: false, invitee_id: null, invitee_name: null };
                    }
                    const invitee = invitees.find((i) => i.id === body.invitee_id);
                    return {
                        ...c,
                        ignored: false,
                        invitee_id: body.invitee_id,
                        invitee_name: invitee?.name ?? null,
                    };
                })
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update cluster");
        }
    };

    const openDetail = async (clusterId: string) => {
        const requestId = ++detailRequestId.current;
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/dashboard/faces/clusters/${clusterId}`);
            if (!res.ok) throw new Error("Failed to load cluster");
            const json = await res.json();
            // Guard after the last await — res.json() is an await point too,
            // and a close during parsing must not resurface stale data.
            if (detailRequestId.current !== requestId) return;
            setDetail(json);
        } catch (err) {
            if (detailRequestId.current !== requestId) return; // stale failure, irrelevant
            setError(err instanceof Error ? err.message : "Failed to load cluster");
        } finally {
            if (detailRequestId.current === requestId) setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        detailRequestId.current++;
        setDetail(null);
        setDetailLoading(false);
    };

    const assigned = clusters.filter((c) => c.invitee_id != null).length;
    const ignored = clusters.filter((c) => c.ignored).length;
    const visible = clusters.filter((c) => clusterTab(c) === activeTab);

    // People with at least one assigned face, for the By Person review tab.
    const personOptions = useMemo(() => {
        const byInvitee = new Map<number, { name: string; count: number }>();
        for (const c of clusters) {
            if (c.invitee_id == null) continue;
            const entry = byInvitee.get(c.invitee_id) ?? {
                name: c.invitee_name ?? `Guest #${c.invitee_id}`,
                count: 0,
            };
            entry.count += c.face_count;
            byInvitee.set(c.invitee_id, entry);
        }
        return [...byInvitee.entries()]
            .sort((a, b) => a[1].name.localeCompare(b[1].name))
            .map(([id, v]) => ({
                value: String(id),
                label: `${v.name} (${v.count} face${v.count === 1 ? "" : "s"})`,
            }));
    }, [clusters]);
    const counts: Record<Exclude<FilterTab, "by-person">, number> = {
        unassigned: clusters.length - assigned - ignored,
        assigned,
        ignored,
    };

    const inviteeOptions = invitees.map((i) => ({
        value: String(i.id),
        label: i.code ? `${i.name} (${i.code})` : i.name,
    }));

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Title order={2} style={{ fontWeight: 300, color: "#495057", fontFamily: "serif" }}>
                    Faces
                </Title>
                <Anchor component={Link} href="/dashboard/photos" size="sm" c="dimmed">
                    ← Photo moderation
                </Anchor>
            </Group>

            <Text c="dimmed" size="sm">
                {assigned} of {clusters.length - ignored} people identified · {ignored} ignored
                {unclusteredFaces > 0 &&
                    ` · ${unclusteredFaces} faces not yet clustered (run the clustering script)`}
            </Text>

            {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(v) => setActiveTab(v as FilterTab)}>
                <Tabs.List>
                    <Tabs.Tab value="unassigned">
                        Unassigned{" "}
                        {counts.unassigned > 0 && (
                            <Badge size="xs" color="yellow" ml={4}>
                                {counts.unassigned}
                            </Badge>
                        )}
                    </Tabs.Tab>
                    <Tabs.Tab value="assigned">Assigned</Tabs.Tab>
                    <Tabs.Tab value="ignored">Ignored</Tabs.Tab>
                    <Tabs.Tab value="by-person">By Person</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {activeTab === "by-person" ? (
                <PersonReview
                    options={personOptions}
                    onError={setError}
                    onDetached={fetchClusters}
                />
            ) : loading ? (
                <Center py="xl">
                    <Loader color="yellow" />
                </Center>
            ) : visible.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed">
                        {activeTab === "unassigned" && clusters.length > 0
                            ? "All faces are labeled 🎉"
                            : `No ${activeTab} faces`}
                    </Text>
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                    {visible.map((cluster) => (
                        <Paper key={cluster.cluster_id} p="sm" withBorder>
                            <Stack gap="xs" align="center">
                                <UnstyledButton
                                    onClick={() => openDetail(cluster.cluster_id)}
                                    title="See every photo of this face"
                                >
                                    <FaceCrop
                                        src={cluster.rep_face.thumbnail_url}
                                        box={cluster.rep_face.bounding_box}
                                        imgWidth={cluster.rep_face.thumbnail_width}
                                        imgHeight={cluster.rep_face.thumbnail_height}
                                        size={120}
                                    />
                                </UnstyledButton>
                                <Badge variant="light" color="gray">
                                    {cluster.face_count} photo{cluster.face_count === 1 ? "" : "s"}
                                </Badge>
                                {cluster.invitee_name && (
                                    <Badge color="green" variant="light">
                                        {cluster.invitee_name}
                                    </Badge>
                                )}
                                {activeTab === "unassigned" ? (
                                    <>
                                        <Select
                                            placeholder="Who is this?"
                                            data={inviteeOptions}
                                            searchable
                                            size="xs"
                                            w="100%"
                                            onChange={(value) =>
                                                value &&
                                                patchCluster(cluster.cluster_id, {
                                                    invitee_id: Number(value),
                                                })
                                            }
                                        />
                                        <Button
                                            variant="subtle"
                                            color="gray"
                                            size="compact-xs"
                                            onClick={() =>
                                                patchCluster(cluster.cluster_id, { ignored: true })
                                            }
                                        >
                                            Ignore
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="subtle"
                                        color="gray"
                                        size="compact-xs"
                                        onClick={() =>
                                            patchCluster(cluster.cluster_id, { invitee_id: null })
                                        }
                                    >
                                        Clear
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    ))}
                </SimpleGrid>
            )}

            <Modal
                opened={detail !== null || detailLoading}
                onClose={closeDetail}
                title={
                    detail?.invitee_name
                        ? `Faces assigned to ${detail.invitee_name}`
                        : "All faces in this cluster"
                }
                size="lg"
            >
                {detailLoading || !detail ? (
                    <Center py="lg">
                        <Loader color="yellow" />
                    </Center>
                ) : (
                    <Stack gap="sm">
                        <Text size="sm" c="dimmed">
                            If two different people appear here, the clustering threshold was too
                            low for this group — re-run the script with a higher --threshold
                            before labeling.
                        </Text>
                        <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm">
                            {detail.faces.map((face) => (
                                <FaceCrop
                                    key={face.face_id}
                                    src={face.thumbnail_url}
                                    box={face.bounding_box}
                                    imgWidth={face.thumbnail_width}
                                    imgHeight={face.thumbnail_height}
                                    size={90}
                                />
                            ))}
                        </SimpleGrid>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}

interface PersonReviewProps {
    options: { value: string; label: string }[];
    onError: (message: string) => void;
    onDetached: () => void;
}

// "Show me every face of the selected person" with a reject button per face.
// Rejecting detaches the face into an unassigned singleton — it leaves this
// person (and guest results) immediately and reappears in the Unassigned tab.
function PersonReview({ options, onError, onDetached }: PersonReviewProps) {
    const [personId, setPersonId] = useState<string | null>(null);
    const [faces, setFaces] = useState<FaceView[] | null>(null);
    const [loading, setLoading] = useState(false);
    // Guards against a slow response landing after the admin switched person.
    const requestId = useRef(0);

    const loadFaces = async (id: string) => {
        const reqId = ++requestId.current;
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard/faces/by-invitee/${id}`);
            if (!res.ok) throw new Error("Failed to load this person's faces");
            const data = await res.json();
            if (requestId.current !== reqId) return;
            setFaces(data.faces ?? []);
        } catch (err) {
            if (requestId.current !== reqId) return;
            onError(err instanceof Error ? err.message : "Failed to load this person's faces");
        } finally {
            if (requestId.current === reqId) setLoading(false);
        }
    };

    const rejectFace = async (faceId: string) => {
        const previous = faces;
        setFaces((prev) => (prev ?? []).filter((f) => f.face_id !== faceId));
        try {
            const res = await fetch(`/api/dashboard/faces/${faceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ detach: true }),
            });
            if (!res.ok) throw new Error("Failed to reject face");
            onDetached();
        } catch (err) {
            setFaces(previous);
            onError(err instanceof Error ? err.message : "Failed to reject face");
        }
    };

    return (
        <Stack gap="md">
            <Select
                label="Show me all faces of"
                placeholder={options.length === 0 ? "No one assigned yet" : "Pick a person"}
                data={options}
                searchable
                value={personId}
                disabled={options.length === 0}
                maw={360}
                onChange={(value) => {
                    setPersonId(value);
                    setFaces(null);
                    if (value) loadFaces(value);
                }}
            />

            {personId && (
                <Text size="sm" c="dimmed">
                    Blurriest, least-certain faces first — mistakes tend to be near the top.
                    Click ✕ on any face that isn&apos;t them; it moves back to the Unassigned
                    tab.
                </Text>
            )}

            {loading ? (
                <Center py="xl">
                    <Loader color="yellow" />
                </Center>
            ) : !personId ? (
                <Center py="xl">
                    <Text c="dimmed">Pick a person to verify every face assigned to them.</Text>
                </Center>
            ) : faces && faces.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed">No faces are assigned to this person.</Text>
                </Center>
            ) : faces ? (
                <SimpleGrid cols={{ base: 3, sm: 5, md: 7, lg: 8 }} spacing="sm">
                    {faces.map((face) => (
                        <div key={face.face_id} style={{ position: "relative" }}>
                            <FaceCrop
                                src={face.thumbnail_url}
                                box={face.bounding_box}
                                imgWidth={face.thumbnail_width}
                                imgHeight={face.thumbnail_height}
                                size={104}
                            />
                            <Tooltip label="Not them — move to Unassigned">
                                <ActionIcon
                                    size="sm"
                                    variant="filled"
                                    color="red"
                                    aria-label="Reject face"
                                    style={{ position: "absolute", top: 2, right: 2 }}
                                    onClick={() => rejectFace(face.face_id)}
                                >
                                    <IconX size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </div>
                    ))}
                </SimpleGrid>
            ) : null}
        </Stack>
    );
}

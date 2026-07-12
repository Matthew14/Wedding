"use client";

import { useState, useEffect, useCallback } from "react";
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
    Image,
    Alert,
    Loader,
    Center,
    Anchor,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
import Link from "next/link";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { Photo, PhotoCategory } from "@/types/photos";

interface PhotoWithThumbnail extends Photo {
    thumbnail_url: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    pending: "yellow",
    approved: "green",
    rejected: "red",
};

export default function PhotosModerationPage() {
    const [activeStatus, setActiveStatus] = useState<"pending" | "approved" | "rejected">("pending");
    const [photos, setPhotos] = useState<PhotoWithThumbnail[]>([]);
    const [categories, setCategories] = useState<PhotoCategory[]>([]);
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    // Only processed photos can be viewed large; unprocessed ones have no
    // image to show yet.
    const viewablePhotos = photos.filter((p) => p.thumbnail_url);

    const fetchCounts = useCallback(async () => {
        try {
            const [p, a, r] = await Promise.all([
                fetch("/api/photos?limit=1&status=pending").then((r) => r.json()),
                fetch("/api/photos?limit=1&status=approved").then((r) => r.json()),
                fetch("/api/photos?limit=1&status=rejected").then((r) => r.json()),
            ]);
            setCounts({
                pending: p.total ?? 0,
                approved: a.total ?? 0,
                rejected: r.total ?? 0,
            });
        } catch {
            // counts are best-effort
        }
    }, []);

    const fetchPhotos = useCallback(async (status: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/photos?status=${status}&limit=50`);
            if (!res.ok) throw new Error("Failed to load photos");
            const data = await res.json();
            setPhotos(data.photos ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load photos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch("/api/gallery/categories")
            .then((r) => r.json())
            .then((d) => setCategories(d.categories ?? []))
            .catch(() => {});
        fetchCounts();
    }, [fetchCounts]);

    useEffect(() => {
        fetchPhotos(activeStatus);
    }, [activeStatus, fetchPhotos]);

    const updatePhoto = async (id: string, status: "approved" | "rejected", categoryId?: string) => {
        try {
            const res = await fetch(`/api/photos/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, ...(categoryId && { categoryId }) }),
            });
            if (!res.ok) throw new Error("Update failed");
            setPhotos((prev) => prev.filter((p) => p.id !== id));
            fetchCounts();
            // Tell the dashboard layout to refresh the Photos-tab pending badge
            window.dispatchEvent(new CustomEvent("wedding:photos-moderated"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update photo");
        }
    };

    const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Title order={2} style={{ fontWeight: 300, color: "#495057", fontFamily: "serif" }}>
                    Photo Moderation
                </Title>
                <Anchor component={Link} href="/dashboard/photos/categories" size="sm" c="dimmed">
                    Manage categories →
                </Anchor>
            </Group>

            {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                    {error}
                </Alert>
            )}

            <Tabs
                value={activeStatus}
                onChange={(v) => setActiveStatus(v as "pending" | "approved" | "rejected")}
            >
                <Tabs.List>
                    <Tabs.Tab value="pending">
                        Pending{" "}
                        {counts.pending > 0 && (
                            <Badge size="xs" color="yellow" ml={4}>
                                {counts.pending}
                            </Badge>
                        )}
                    </Tabs.Tab>
                    <Tabs.Tab value="approved">Approved</Tabs.Tab>
                    <Tabs.Tab value="rejected">Rejected</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {loading ? (
                <Center py="xl">
                    <Loader color="yellow" />
                </Center>
            ) : photos.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed">No {activeStatus} photos</Text>
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                    {photos.map((photo) => (
                        <PhotoCard
                            key={photo.id}
                            photo={photo}
                            categoryOptions={categoryOptions}
                            onApprove={(categoryId) => updatePhoto(photo.id, "approved", categoryId)}
                            onReject={() => updatePhoto(photo.id, "rejected")}
                            onView={() =>
                                setLightboxIndex(viewablePhotos.findIndex((p) => p.id === photo.id))
                            }
                        />
                    ))}
                </SimpleGrid>
            )}

            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                index={lightboxIndex}
                slides={viewablePhotos.map((p) => ({
                    src: p.thumbnail_url as string,
                    width: p.width ?? undefined,
                    height: p.height ?? undefined,
                    alt: p.file_name,
                }))}
            />
        </Stack>
    );
}

function PhotoCard({
    photo,
    categoryOptions,
    onApprove,
    onReject,
    onView,
}: {
    photo: PhotoWithThumbnail;
    categoryOptions: { value: string; label: string }[];
    onApprove: (categoryId?: string) => void;
    onReject: () => void;
    onView: () => void;
}) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(photo.category_id);

    // Status changes are allowed in both directions: a photo can be approved
    // unless it already is, and rejected unless it already is.
    const canApprove = photo.status !== "approved";
    const canReject = photo.status !== "rejected";

    return (
        <Paper shadow="sm" radius="md" p="sm" withBorder>
            <Stack gap="xs">
                {photo.thumbnail_url ? (
                    <Image
                        src={photo.thumbnail_url}
                        alt={photo.file_name}
                        radius="sm"
                        style={{ aspectRatio: "4/3", objectFit: "cover", cursor: "zoom-in" }}
                        onClick={onView}
                    />
                ) : (
                    <Paper
                        style={{
                            aspectRatio: "4/3",
                            backgroundColor: "#f1f3f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        radius="sm"
                    >
                        <Text size="xs" c="dimmed">
                            Processing…
                        </Text>
                    </Paper>
                )}

                <Stack gap={4}>
                    <Text size="xs" c="dimmed" truncate>
                        {photo.file_name}
                    </Text>
                    <Group gap="xs">
                        <Badge size="xs" color={STATUS_COLORS[photo.status]}>
                            {photo.status}
                        </Badge>
                        <Text size="xs" c="dimmed">
                            {photo.invitation_code}
                        </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                        {new Date(photo.uploaded_at).toLocaleDateString()}
                    </Text>
                </Stack>

                {canApprove && (
                    <Select
                        placeholder="Category (optional)"
                        data={categoryOptions}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        size="xs"
                        clearable
                    />
                )}
                <Group gap="xs">
                    {canApprove && (
                        <Button
                            size="xs"
                            color="green"
                            leftSection={<IconCheck size={12} />}
                            flex={1}
                            onClick={() => onApprove(selectedCategory ?? undefined)}
                        >
                            Approve
                        </Button>
                    )}
                    {canReject && (
                        <Button
                            size="xs"
                            color="red"
                            variant="outline"
                            leftSection={<IconX size={12} />}
                            flex={1}
                            onClick={onReject}
                        >
                            Reject
                        </Button>
                    )}
                </Group>
            </Stack>
        </Paper>
    );
}

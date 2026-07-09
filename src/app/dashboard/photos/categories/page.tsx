"use client";

import { useState, useEffect } from "react";
import {
    Stack,
    Title,
    Text,
    Paper,
    Group,
    Button,
    TextInput,
    Select,
    NumberInput,
    Alert,
    SimpleGrid,
    Badge,
    Anchor,
    ActionIcon,
} from "@mantine/core";
import { IconAlertCircle, IconPlus, IconPencil } from "@tabler/icons-react";
import Link from "next/link";
import type { PhotoCategory } from "@/types/photos";

const EVENT_DAY_OPTIONS = [
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<PhotoCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [eventDay, setEventDay] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<number | string>(0);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editSortOrder, setEditSortOrder] = useState<number | string>(0);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/gallery/categories");
            const data = await res.json();
            setCategories(data.categories ?? []);
        } catch {
            setError("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleNameChange = (value: string) => {
        setName(value);
        if (!slug || slug === slugify(name)) {
            setSlug(slugify(value));
        }
    };

    const startEditing = (category: PhotoCategory) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditDescription(category.description ?? "");
        setEditSortOrder(category.sort_order);
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            setEditError("Name is required");
            return;
        }
        setSaving(true);
        setEditError(null);
        try {
            const res = await fetch(`/api/gallery/categories/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    sort_order: Number(editSortOrder) || 0,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Failed to update category");
            }
            setEditingId(null);
            fetchCategories();
        } catch (err) {
            setEditError(err instanceof Error ? err.message : "Failed to update category");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim() || !slug.trim()) {
            setFormError("Name and slug are required");
            return;
        }
        setSubmitting(true);
        setFormError(null);
        try {
            const res = await fetch("/api/gallery/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    slug: slug.trim(),
                    description: description.trim() || null,
                    event_day: eventDay,
                    sort_order: Number(sortOrder) || 0,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Failed to create category");
            }
            setName("");
            setSlug("");
            setDescription("");
            setEventDay(null);
            setSortOrder(0);
            setShowForm(false);
            fetchCategories();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create category");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Title order={2} style={{ fontWeight: 300, color: "#495057", fontFamily: "serif" }}>
                    Photo Categories
                </Title>
                <Group gap="sm">
                    <Anchor component={Link} href="/dashboard/photos" size="sm" c="dimmed">
                        ← Back to moderation
                    </Anchor>
                    <Button
                        leftSection={<IconPlus size={14} />}
                        size="sm"
                        color="yellow"
                        onClick={() => setShowForm((v) => !v)}
                    >
                        New category
                    </Button>
                </Group>
            </Group>

            {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                    {error}
                </Alert>
            )}

            {showForm && (
                <Paper p="lg" radius="md" withBorder>
                    <Stack gap="sm">
                        <Text fw={500} size="sm">
                            New category
                        </Text>
                        {formError && (
                            <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light" py="xs">
                                {formError}
                            </Alert>
                        )}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <TextInput
                                label="Name"
                                value={name}
                                onChange={(e) => handleNameChange(e.currentTarget.value)}
                                required
                            />
                            <TextInput
                                label="Slug"
                                value={slug}
                                onChange={(e) => setSlug(e.currentTarget.value)}
                                required
                                description="URL-safe identifier"
                            />
                            <TextInput
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.currentTarget.value)}
                            />
                            <Select
                                label="Event day"
                                data={EVENT_DAY_OPTIONS}
                                value={eventDay}
                                onChange={setEventDay}
                                clearable
                            />
                            <NumberInput
                                label="Sort order"
                                value={sortOrder}
                                onChange={setSortOrder}
                                min={0}
                            />
                        </SimpleGrid>
                        <Group gap="xs" justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                            <Button color="yellow" onClick={handleSubmit} loading={submitting}>
                                Create
                            </Button>
                        </Group>
                    </Stack>
                </Paper>
            )}

            {!loading && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {categories.map((c) => (
                        <Paper key={c.id} shadow="sm" radius="md" p="md" withBorder>
                            {editingId === c.id ? (
                                <Stack gap="xs">
                                    {editError && (
                                        <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light" py="xs">
                                            {editError}
                                        </Alert>
                                    )}
                                    <TextInput
                                        label="Name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.currentTarget.value)}
                                        required
                                    />
                                    <TextInput
                                        label="Description"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.currentTarget.value)}
                                    />
                                    <NumberInput
                                        label="Sort order"
                                        value={editSortOrder}
                                        onChange={setEditSortOrder}
                                        min={0}
                                    />
                                    <Text size="xs" c="dimmed" ff="monospace">
                                        {c.slug} (fixed)
                                    </Text>
                                    <Group gap="xs" justify="flex-end">
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="gray"
                                            onClick={() => setEditingId(null)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button size="xs" color="yellow" onClick={handleSaveEdit} loading={saving}>
                                            Save
                                        </Button>
                                    </Group>
                                </Stack>
                            ) : (
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={500}>{c.name}</Text>
                                        <Group gap={4}>
                                            <Text size="xs" c="dimmed">
                                                #{c.sort_order}
                                            </Text>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="gray"
                                                aria-label={`Edit ${c.name}`}
                                                onClick={() => startEditing(c)}
                                            >
                                                <IconPencil size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                    <Text size="xs" c="dimmed" ff="monospace">
                                        {c.slug}
                                    </Text>
                                    {c.event_day && (
                                        <Badge size="xs" variant="light" color="yellow" tt="capitalize">
                                            {c.event_day}
                                        </Badge>
                                    )}
                                    {c.description && (
                                        <Text size="xs" c="dimmed">
                                            {c.description}
                                        </Text>
                                    )}
                                </Stack>
                            )}
                        </Paper>
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
}

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

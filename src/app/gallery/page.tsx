"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Container,
    Title,
    Text,
    Tabs,
    Stack,
    Box,
    TextInput,
    Button,
    Alert,
    Group,
    Loader,
    Center,
} from "@mantine/core";
import { IconAlertCircle, IconDownload } from "@tabler/icons-react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import type { Photo, PhotoCategory } from "@/types/photos";
import Link from "next/link";

interface GalleryPhoto {
    src: string;
    width: number;
    height: number;
    alt: string;
    id: string;
    key: string;
}

const FALLBACK_ASPECT = { width: 4, height: 3 };

export default function GalleryPage() {
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [categories, setCategories] = useState<PhotoCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [invitationCode, setInvitationCode] = useState<string>("");
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const LIMIT = 40;

    useEffect(() => {
        const stored = localStorage.getItem("invitation_code");
        if (stored) setInvitationCode(stored);
    }, []);

    const fetchPhotos = useCallback(
        async (category: string | null, pg: number) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
                if (category) params.set("category", category);
                const res = await fetch(`/api/photos?${params}`);
                if (!res.ok) throw new Error("Failed to load photos");
                const data = await res.json();
                type ApiPhoto = Photo & { thumbnail_url: string | null };
                const mapped: GalleryPhoto[] = (data.photos as ApiPhoto[]).map((p) => ({
                    src: p.thumbnail_url ?? "",
                    width: p.width ?? FALLBACK_ASPECT.width,
                    height: p.height ?? FALLBACK_ASPECT.height,
                    alt: p.file_name,
                    id: p.id,
                    key: p.s3_key,
                }));
                setPhotos((prev) => (pg === 1 ? mapped : [...prev, ...mapped]));
                setHasMore(mapped.length === LIMIT);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load photos");
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetch("/api/gallery/categories")
            .then((r) => r.json())
            .then((d) => setCategories(d.categories ?? []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setPage(1);
        setPhotos([]);
        fetchPhotos(activeCategory, 1);
    }, [activeCategory, fetchPhotos]);

    // Infinite scroll: load the next page when the sentinel scrolls into view.
    // The effect re-runs on every relevant state change so the observer always
    // closes over fresh values (and won't double-fire while a fetch is in flight).
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore || loading) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const next = page + 1;
                    setPage(next);
                    fetchPhotos(activeCategory, next);
                }
            },
            { rootMargin: "400px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading, page, activeCategory, fetchPhotos]);

    const handleCodeSubmit = () => {
        if (codeInput.trim().length !== 6) {
            setCodeError("Please enter your 6-character invitation code");
            return;
        }
        localStorage.setItem("invitation_code", codeInput.trim().toUpperCase());
        setInvitationCode(codeInput.trim().toUpperCase());
        setCodeError(null);
    };

    const lightboxSlides = photos.map((p) => ({
        src: p.src,
        width: p.width,
        height: p.height,
        alt: p.alt,
        download: {
            url: `/api/photos/${p.id}/download-url?code=${invitationCode}`,
            filename: p.alt,
        },
    }));

    return (
        <main id="main-content">
            <Container size="xl" py="xl">
                <Stack gap="lg">
                    <Group justify="space-between" align="flex-end">
                        <Box>
                            <Title
                                order={1}
                                style={{
                                    fontFamily: "var(--font-playfair), serif",
                                    fontWeight: 300,
                                    color: "var(--gold-dark)",
                                    fontSize: "clamp(2rem, 5vw, 3rem)",
                                }}
                            >
                                Wedding Gallery
                            </Title>
                            <Text c="dimmed" size="sm" mt={4}>
                                Share your memories from our special day
                            </Text>
                        </Box>
                        <Button component={Link} href="/gallery/upload" variant="light" color="yellow">
                            Upload Photos
                        </Button>
                    </Group>

                    {!invitationCode && (
                        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
                            <Text size="sm" mb="xs">
                                Enter your invitation code to download full-resolution photos. Or click the
                                link we sent you.
                            </Text>
                            <Group gap="xs">
                                <TextInput
                                    placeholder="e.g. ABC123"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.currentTarget.value.toUpperCase())}
                                    maxLength={6}
                                    size="xs"
                                    error={codeError}
                                    styles={{ input: { textTransform: "uppercase", width: 120 } }}
                                />
                                <Button size="xs" variant="filled" color="yellow" onClick={handleCodeSubmit}>
                                    Save
                                </Button>
                            </Group>
                        </Alert>
                    )}

                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                            {error}
                        </Alert>
                    )}

                    <Tabs value={activeCategory ?? "all"} onChange={(v) => setActiveCategory(v === "all" ? null : v)}>
                        <Tabs.List>
                            <Tabs.Tab value="all">All Photos</Tabs.Tab>
                            {categories.map((c) => (
                                <Tabs.Tab key={c.id} value={c.slug}>
                                    {c.name}
                                </Tabs.Tab>
                            ))}
                        </Tabs.List>
                    </Tabs>

                    {loading && photos.length === 0 ? (
                        <Center py="xl">
                            <Loader color="yellow" />
                        </Center>
                    ) : photos.length === 0 ? (
                        <Center py="xl">
                            <Text c="dimmed">No photos yet — be the first to share!</Text>
                        </Center>
                    ) : (
                        <RowsPhotoAlbum
                            photos={photos}
                            targetRowHeight={240}
                            onClick={({ index }) => setLightboxIndex(index)}
                        />
                    )}

                    {loading && photos.length > 0 && (
                        <Center py="md">
                            <Loader size="sm" color="yellow" />
                        </Center>
                    )}

                    {/* Infinite-scroll sentinel — observed to trigger the next page */}
                    {hasMore && photos.length > 0 && <Box ref={sentinelRef} h={1} />}
                </Stack>
            </Container>

            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                slides={lightboxSlides}
                index={lightboxIndex}
                plugins={[Download]}
                render={{
                    iconDownload: () => <IconDownload size={20} />,
                }}
            />
        </main>
    );
}

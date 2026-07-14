"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Container,
    Title,
    Text,
    Tabs,
    Stack,
    Box,
    Button,
    Alert,
    Group,
    Loader,
    Center,
} from "@mantine/core";
import { IconAlertCircle, IconDownload, IconTrash } from "@tabler/icons-react";
import { useSession } from "@/hooks/useSession";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import type { PublicPhoto, PhotoCategory } from "@/types/photos";
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

// useSearchParams requires a Suspense boundary in App Router client pages.
export default function GalleryPage() {
    return (
        <Suspense fallback={null}>
            <Gallery />
        </Suspense>
    );
}

function Gallery() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [categories, setCategories] = useState<PhotoCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [invitationCode, setInvitationCode] = useState<string>("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [rejecting, setRejecting] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const { status: sessionStatus } = useSession();
    const isAdmin = sessionStatus === "authenticated";
    const LIMIT = 40;

    // The photo list as of the latest render — rejectCurrent reads it after
    // an await, by which point the closed-over `photos` may be stale (e.g.
    // infinite scroll appended a page while the PATCH was in flight).
    const photosRef = useRef(photos);
    useEffect(() => {
        photosRef.current = photos;
    }, [photos]);

    // Admins can pull a photo straight from the lightbox: reject it and drop
    // it from view without a trip to the moderation tab.
    const rejectCurrent = async () => {
        const photo = photos[lightboxIndex];
        if (!photo || rejecting) return;
        setRejecting(true);
        try {
            const res = await fetch(`/api/photos/${photo.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "rejected" }),
            });
            if (!res.ok) throw new Error("Failed to reject photo");
            const next = photosRef.current.filter((p) => p.id !== photo.id);
            setPhotos(next);
            // Functional form: the admin may have navigated the lightbox
            // while the request was in flight.
            setLightboxIndex((i) => (next.length === 0 ? -1 : Math.min(i, next.length - 1)));
        } catch (err) {
            // Keep the lightbox open so the admin can retry without losing
            // their place; the photo is still in the list.
            setError(err instanceof Error ? err.message : "Failed to reject photo");
        } finally {
            setRejecting(false);
        }
    };

    // Personal links carry ?code=XXXXXX. Store it (last link visited wins),
    // then strip the param so copy-pasting the address doesn't share the code.
    useEffect(() => {
        const urlCode = searchParams.get("code")?.trim().toUpperCase();
        if (urlCode && /^[A-Z0-9]{6}$/.test(urlCode)) {
            localStorage.setItem("invitation_code", urlCode);
            setInvitationCode(urlCode);
            router.replace("/gallery", { scroll: false });
            return;
        }
        const stored = localStorage.getItem("invitation_code");
        if (stored) setInvitationCode(stored);
    }, [searchParams, router]);

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
                const mapped: GalleryPhoto[] = (data.photos as PublicPhoto[]).map((p) => ({
                    src: p.thumbnail_url ?? "",
                    width: p.width ?? FALLBACK_ASPECT.width,
                    height: p.height ?? FALLBACK_ASPECT.height,
                    alt: p.file_name,
                    id: p.id,
                    key: p.id,
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
                        <Text size="sm" c="dimmed">
                            You&apos;re viewing the public gallery. If we sent you a personalised link,
                            open it to unlock full-resolution downloads.
                        </Text>
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
                on={{ view: ({ index }) => setLightboxIndex(index) }}
                plugins={invitationCode ? [Download] : []}
                render={{
                    iconDownload: () => <IconDownload size={20} />,
                }}
                toolbar={{
                    buttons: [
                        isAdmin ? (
                            <button
                                key="reject"
                                type="button"
                                className="yarl__button"
                                onClick={rejectCurrent}
                                disabled={rejecting}
                                aria-label="Reject photo"
                                title="Reject photo"
                            >
                                <IconTrash size={20} color="#ff6b6b" />
                            </button>
                        ) : null,
                        "close",
                    ],
                }}
            />
        </main>
    );
}

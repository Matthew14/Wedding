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
    Paper,
    TextInput,
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
    const [codeChecked, setCodeChecked] = useState(false);
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const [validatingCode, setValidatingCode] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [rejecting, setRejecting] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const { status: sessionStatus } = useSession();
    const isAdmin = sessionStatus === "authenticated";
    const LIMIT = 40;

    // The gallery is code-access only: a guest needs a code (from their
    // personalised link, a previous visit, or typed in below); a logged-in
    // admin gets in regardless and has the master code auto-filled.
    const hasAccess = !!invitationCode || isAdmin;
    const showCodeGate = codeChecked && !invitationCode && sessionStatus === "unauthenticated";

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
        } else {
            const stored = localStorage.getItem("invitation_code");
            if (stored) setInvitationCode(stored);
        }
        setCodeChecked(true);
    }, [searchParams, router]);

    // Logged-in admins get the bride & groom's master code auto-filled so
    // downloads and uploads work without typing anything.
    useEffect(() => {
        if (sessionStatus !== "authenticated" || invitationCode) return;
        fetch("/api/auth/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.masterCode) {
                    localStorage.setItem("invitation_code", data.masterCode);
                    setInvitationCode(data.masterCode);
                }
            })
            .catch(() => {}); // downloads just stay code-less until retry
    }, [sessionStatus, invitationCode]);

    // Manual entry on the code gate.
    const handleCodeSubmit = async () => {
        const trimmed = codeInput.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
            setCodeError("Please enter your 6-character invitation code");
            return;
        }
        setValidatingCode(true);
        setCodeError(null);
        try {
            const res = await fetch("/api/photos/validate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: trimmed }),
            });
            const data = await res.json();
            if (!data.valid) {
                setCodeError(data.error ?? "Invalid invitation code");
                return;
            }
            localStorage.setItem("invitation_code", trimmed);
            setInvitationCode(trimmed);
        } catch {
            setCodeError("Something went wrong — please try again");
        } finally {
            setValidatingCode(false);
        }
    };

    const fetchPhotos = useCallback(
        async (category: string | null, pg: number) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
                if (category) params.set("category", category);
                if (invitationCode) params.set("code", invitationCode);
                const res = await fetch(`/api/photos?${params}`);
                if (res.status === 401) {
                    // The stored code is no longer accepted — drop it and
                    // fall back to the code gate (admins pass via session).
                    localStorage.removeItem("invitation_code");
                    setInvitationCode("");
                    setPhotos([]);
                    return;
                }
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
        [invitationCode]
    );

    useEffect(() => {
        fetch("/api/gallery/categories")
            .then((r) => r.json())
            .then((d) => setCategories(d.categories ?? []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        // Don't fetch until code resolution has run, and never fetch without
        // access — the API would just 401.
        if (!codeChecked || (!invitationCode && sessionStatus !== "authenticated")) return;
        setPage(1);
        setPhotos([]);
        fetchPhotos(activeCategory, 1);
    }, [activeCategory, fetchPhotos, codeChecked, invitationCode, sessionStatus]);

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

                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                            {error}
                        </Alert>
                    )}

                    {showCodeGate ? (
                        <Paper p="xl" radius="md" withBorder maw={440} mx="auto" mt="lg" w="100%">
                            <Stack gap="sm">
                                <Text fw={500}>This gallery is for our wedding guests</Text>
                                <Text size="sm" c="dimmed">
                                    Enter the code from your invitation, or open the personalised
                                    link we sent you.
                                </Text>
                                <TextInput
                                    placeholder="e.g. ABC123"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.currentTarget.value.toUpperCase())}
                                    maxLength={6}
                                    error={codeError}
                                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                                    styles={{ input: { textTransform: "uppercase", letterSpacing: "0.1em" } }}
                                />
                                <Button color="yellow" onClick={handleCodeSubmit} loading={validatingCode}>
                                    View the gallery
                                </Button>
                            </Stack>
                        </Paper>
                    ) : !hasAccess ? (
                        <Center py="xl">
                            <Loader color="yellow" />
                        </Center>
                    ) : (
                        <>
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
                        </>
                    )}
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
                    iconDownload: () => <IconDownload size={32} />,
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

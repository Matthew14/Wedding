"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Container,
    Title,
    Text,
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
import { IconAlertCircle, IconDownload } from "@tabler/icons-react";
import { useSession } from "@/hooks/useSession";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import type { PublicPhoto } from "@/types/photos";
import Link from "next/link";

interface GalleryPhoto {
    src: string;
    width: number;
    height: number;
    alt: string;
    id: string;
    key: string;
    uploadedBy: string | null;
}

const FALLBACK_ASPECT = { width: 4, height: 3 };

// A household appears in far fewer photos than the full gallery, so one
// fetch covers it — no category tabs or infinite scroll here.
const LIMIT = 200;

export default function MyPhotosPage() {
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [inviteeNames, setInviteeNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [invitationCode, setInvitationCode] = useState<string>("");
    const [codeChecked, setCodeChecked] = useState(false);
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const [validatingCode, setValidatingCode] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { status: sessionStatus, masterCode } = useSession();
    const isAdmin = sessionStatus === "authenticated";

    const hasAccess = !!invitationCode || isAdmin;
    const showCodeGate = codeChecked && !invitationCode && sessionStatus === "unauthenticated";

    // Same storage key as the main gallery: guests who've been through the
    // gate once are already recognised here.
    useEffect(() => {
        const stored = localStorage.getItem("invitation_code");
        if (stored) setInvitationCode(stored);
        setCodeChecked(true);
    }, []);

    useEffect(() => {
        if (!isAdmin || invitationCode || !masterCode) return;
        localStorage.setItem("invitation_code", masterCode);
        setInvitationCode(masterCode);
    }, [isAdmin, invitationCode, masterCode]);

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

    const fetchPhotos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit: String(LIMIT) });
            if (invitationCode) params.set("code", invitationCode);
            const res = await fetch(`/api/gallery/my-photos?${params}`);
            if (res.status === 401) {
                localStorage.removeItem("invitation_code");
                setInvitationCode("");
                setPhotos([]);
                return;
            }
            if (!res.ok) throw new Error("Failed to load your photos");
            const data = await res.json();
            setInviteeNames(data.invitees ?? []);
            setPhotos(
                (data.photos as PublicPhoto[]).map((p) => ({
                    src: p.thumbnail_url ?? "",
                    width: p.width ?? FALLBACK_ASPECT.width,
                    height: p.height ?? FALLBACK_ASPECT.height,
                    alt: p.file_name,
                    id: p.id,
                    key: p.id,
                    uploadedBy: p.uploaded_by ?? null,
                }))
            );
            setLoaded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load your photos");
        } finally {
            setLoading(false);
        }
    }, [invitationCode]);

    useEffect(() => {
        if (!codeChecked || (!invitationCode && sessionStatus !== "authenticated")) return;
        fetchPhotos();
    }, [codeChecked, invitationCode, sessionStatus, fetchPhotos]);

    const lightboxSlides = photos.map((p) => ({
        src: p.src,
        width: p.width,
        height: p.height,
        alt: p.alt,
        // Attribution caption for guest uploads; professional photos have none.
        ...(p.uploadedBy && { description: `Shared by ${p.uploadedBy}` }),
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
                                Photos of You
                            </Title>
                            <Text c="dimmed" size="sm" mt={4}>
                                {inviteeNames.length > 0
                                    ? `Photos we found of ${inviteeNames.join(", ").replace(/, ([^,]*)$/, " and $1")}`
                                    : "Every photo from the day that you appear in"}
                            </Text>
                        </Box>
                        <Button component={Link} href="/gallery" variant="light" color="yellow">
                            Full Gallery
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
                                <Text fw={500}>Find the photos you appear in</Text>
                                <Text size="sm" c="dimmed">
                                    Enter the code from your invitation and we&apos;ll show you
                                    every photo from the day that you&apos;re in.
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
                                    Find my photos
                                </Button>
                            </Stack>
                        </Paper>
                    ) : !hasAccess || (loading && !loaded) ? (
                        <Center py="xl">
                            <Loader color="yellow" />
                        </Center>
                    ) : photos.length === 0 ? (
                        <Center py="xl">
                            <Stack align="center" gap="xs">
                                <Text c="dimmed">
                                    {isAdmin && (!invitationCode || invitationCode === masterCode)
                                        ? "No faces are assigned to you two yet — label your clusters in the dashboard (Photos → Faces)."
                                        : "We haven't spotted you in any photos yet."}
                                </Text>
                                <Text c="dimmed" size="sm">
                                    More photos are still being added — check back soon, or browse
                                    the full gallery.
                                </Text>
                            </Stack>
                        </Center>
                    ) : (
                        <RowsPhotoAlbum
                            photos={photos}
                            targetRowHeight={240}
                            onClick={({ index }) => setLightboxIndex(index)}
                        />
                    )}
                </Stack>
            </Container>

            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                slides={lightboxSlides}
                index={lightboxIndex}
                on={{ view: ({ index }) => setLightboxIndex(index) }}
                plugins={invitationCode ? [Captions, Download, Zoom] : [Captions, Zoom]}
                zoom={{ maxZoomPixelRatio: 2 }}
                render={{
                    iconDownload: () => <IconDownload size={32} />,
                }}
            />
        </main>
    );
}

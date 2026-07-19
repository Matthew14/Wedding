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
    Flex,
    Loader,
    Center,
    Paper,
    TextInput,
    Select,
    SegmentedControl,
    UnstyledButton,
    Image,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconDownload,
    IconTrash,
    IconSearch,
    IconChevronLeft,
} from "@tabler/icons-react";
import { useSession } from "@/hooks/useSession";
import { useTracking, GalleryEvents } from "@/hooks/useTracking";
import { useCategoryCardsFlag } from "@/hooks/useCategoryCardsFlag";
import { FaceCrop } from "@/components/FaceCrop";
import type { GalleryPerson } from "@/types/faces";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import type { PublicPhoto, PhotoCategory } from "@/types/photos";
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

// The category tab that gets the "My uploads" sub-filter.
const GUEST_PHOTOS_SLUG = "guest-photos";

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
    const [people, setPeople] = useState<GalleryPerson[]>([]);
    const [personFilter, setPersonFilter] = useState<string | null>(null);
    const [myUploadsOnly, setMyUploadsOnly] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const { status: sessionStatus, masterCode } = useSession();
    const { trackEvent } = useTracking();
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
    // downloads and uploads work without typing anything. useSession already
    // carries it from its /api/auth/me check — no extra round-trip.
    useEffect(() => {
        if (!isAdmin || invitationCode || !masterCode) return;
        localStorage.setItem("invitation_code", masterCode);
        setInvitationCode(masterCode);
    }, [isAdmin, invitationCode, masterCode]);

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
        async (category: string | null, pg: number, person: string | null, mine: boolean) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
                if (category) params.set("category", category);
                // The All Photos tab shows the professional sets only —
                // guest uploads live on the Guest Photos tab.
                else params.set("professional", "1");
                if (person) params.set("person", person);
                if (mine) params.set("mine", "1");
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
                    uploadedBy: p.uploaded_by ?? null,
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

    // The searchable people list (labeled faces). Needs gallery access, so
    // it waits for the same code/session resolution the photos do.
    useEffect(() => {
        if (!codeChecked || (!invitationCode && sessionStatus !== "authenticated")) return;
        const params = invitationCode ? `?code=${invitationCode}` : "";
        fetch(`/api/gallery/people${params}`)
            .then((r) => (r.ok ? r.json() : { people: [] }))
            .then((d) => setPeople(d.people ?? []))
            .catch(() => {});
    }, [codeChecked, invitationCode, sessionStatus]);

    // The sub-filter only applies on the Guest Photos tab (its state is kept
    // so flipping tabs and back doesn't lose the selection).
    const mineActive = myUploadsOnly && activeCategory === GUEST_PHOTOS_SLUG;

    // Guest Photos is pulled out of the category list so it can lead the
    // card strip (or tab row) with its own styling.
    const guestCategory = categories.find((c) => c.slug === GUEST_PHOTOS_SLUG);
    const otherCategories = categories.filter((c) => c.slug !== GUEST_PHOTOS_SLUG);
    const orderedCategories = guestCategory ? [guestCategory, ...otherCategories] : otherCategories;
    const activeCategoryData = categories.find((c) => c.slug === activeCategory);

    // The cover-photo category cards are rolling out behind a PostHog flag;
    // flag off keeps the tab row.
    const cardsEnabled = useCategoryCardsFlag();

    useEffect(() => {
        // Don't fetch until code resolution has run, and never fetch without
        // access — the API would just 401.
        if (!codeChecked || (!invitationCode && sessionStatus !== "authenticated")) return;
        setPage(1);
        setPhotos([]);
        fetchPhotos(activeCategory, 1, personFilter, mineActive);
    }, [activeCategory, personFilter, mineActive, fetchPhotos, codeChecked, invitationCode, sessionStatus]);

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
                    fetchPhotos(activeCategory, next, personFilter, mineActive);
                }
            },
            { rootMargin: "400px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading, page, activeCategory, personFilter, mineActive, fetchPhotos]);

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
                    {/* Stacked and centred on phones, side-by-side on wider screens. */}
                    <Flex
                        direction={{ base: "column", sm: "row" }}
                        align={{ base: "center", sm: "flex-end" }}
                        justify="space-between"
                        gap="md"
                    >
                        <Box ta={{ base: "center", sm: "left" }}>
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
                        {/* Both pages are code-gated — dead ends for a
                            codeless visitor staring at the gate. */}
                        {hasAccess && (
                            <Group gap="sm" justify="center">
                                <Button
                                    component={Link}
                                    href="/gallery/my-photos"
                                    variant="light"
                                    color="yellow"
                                >
                                    Find My Photos
                                </Button>
                                <Button component={Link} href="/gallery/upload" variant="light" color="yellow">
                                    Upload Photos
                                </Button>
                            </Group>
                        )}
                    </Flex>

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
                    {people.length > 0 && (
                        <Select
                            placeholder="Search for someone…"
                            leftSection={<IconSearch size={16} />}
                            data={people.map((p) => ({
                                value: String(p.invitee_id),
                                label: p.name,
                            }))}
                            renderOption={({ option }) => {
                                const person = people.find(
                                    (p) => String(p.invitee_id) === option.value
                                );
                                return (
                                    <Group gap="sm" wrap="nowrap">
                                        {person && (
                                            <FaceCrop
                                                src={person.face.thumbnail_url}
                                                box={person.face.bounding_box}
                                                imgWidth={person.face.thumbnail_width}
                                                imgHeight={person.face.thumbnail_height}
                                                size={36}
                                            />
                                        )}
                                        <div>
                                            <Text size="sm">{option.label}</Text>
                                            {person && (
                                                <Text size="xs" c="dimmed">
                                                    {person.photo_count} photo
                                                    {person.photo_count === 1 ? "" : "s"}
                                                </Text>
                                            )}
                                        </div>
                                    </Group>
                                );
                            }}
                            searchable
                            clearable
                            w="100%"
                            maw={{ base: "100%", sm: 340 }}
                            value={personFilter}
                            onChange={setPersonFilter}
                        />
                    )}

                    {cardsEnabled ? (
                        activeCategory === null ? (
                            /* Cover-photo cards: a swipeable strip guests can't
                               mistake for decoration, with Guest Photos leading
                               in gold. All Photos (the stream below) stays the
                               default view. */
                            orderedCategories.length > 0 && (
                                <Stack gap={6}>
                                    <Text size="sm" fw={500} c="dimmed">
                                        Browse by moment
                                    </Text>
                                    <Box
                                        className="no-scrollbar"
                                        style={{
                                            display: "flex",
                                            gap: 12,
                                            overflowX: "auto",
                                            scrollSnapType: "x proximity",
                                            paddingBottom: 4,
                                        }}
                                    >
                                        {orderedCategories.map((c) => {
                                            const isGuest = c.slug === GUEST_PHOTOS_SLUG;
                                            return (
                                                <UnstyledButton
                                                    key={c.id}
                                                    onClick={() => setActiveCategory(c.slug)}
                                                    aria-label={`Browse ${c.name}`}
                                                    style={{ flexShrink: 0, scrollSnapAlign: "start" }}
                                                >
                                                    <Box
                                                        style={{
                                                            position: "relative",
                                                            width: 148,
                                                            height: 104,
                                                            borderRadius: 12,
                                                            overflow: "hidden",
                                                            border: isGuest
                                                                ? "2px solid var(--gold-dark)"
                                                                : "1px solid #e9ecef",
                                                            backgroundColor: "#f1f3f5",
                                                        }}
                                                    >
                                                        {c.cover_thumbnail_url && (
                                                            <Image
                                                                src={c.cover_thumbnail_url}
                                                                alt=""
                                                                w="100%"
                                                                h="100%"
                                                                fit="cover"
                                                            />
                                                        )}
                                                        <Box
                                                            style={{
                                                                position: "absolute",
                                                                inset: 0,
                                                                background:
                                                                    "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)",
                                                            }}
                                                        />
                                                        <Text
                                                            style={{
                                                                position: "absolute",
                                                                bottom: 6,
                                                                left: 10,
                                                                right: 8,
                                                                color: "#fff",
                                                                fontWeight: 600,
                                                                fontSize: 13,
                                                                lineHeight: 1.2,
                                                                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                                            }}
                                                        >
                                                            {c.name}
                                                        </Text>
                                                    </Box>
                                                </UnstyledButton>
                                            );
                                        })}
                                    </Box>
                                </Stack>
                            )
                        ) : (
                            /* Inside a category: back to the full stream. */
                            <Group gap="xs" align="center">
                                <Button
                                    variant="subtle"
                                    color="gray"
                                    size="compact-sm"
                                    leftSection={<IconChevronLeft size={16} />}
                                    onClick={() => setActiveCategory(null)}
                                >
                                    All photos
                                </Button>
                                <Title
                                    order={3}
                                    style={{
                                        fontFamily: "var(--font-playfair), serif",
                                        fontWeight: 400,
                                        color: "var(--gold-dark)",
                                    }}
                                >
                                    {activeCategoryData?.name ?? ""}
                                </Title>
                            </Group>
                        )
                    ) : (
                        /* Flag off: the tab row. One swipeable row on phones
                           instead of wrapping into a ragged grid; desktop fits
                           in a single row anyway. */
                        <Tabs
                            value={activeCategory ?? "all"}
                            onChange={(v) => setActiveCategory(v === "all" ? null : v)}
                            classNames={{ list: "no-scrollbar" }}
                            styles={{
                                list: { flexWrap: "nowrap", overflowX: "auto" },
                                tab: { whiteSpace: "nowrap", flexShrink: 0 },
                            }}
                        >
                            <Tabs.List>
                                {/* Guest Photos leads the row with the gold
                                    highlight to invite sharing — but All Photos
                                    (the Tabs default above) stays selected until
                                    the guest taps it. */}
                                {guestCategory && (
                                    <Tabs.Tab
                                        value={guestCategory.slug}
                                        color="yellow"
                                        style={{ color: "var(--gold-dark)", fontWeight: 600 }}
                                    >
                                        {guestCategory.name}
                                    </Tabs.Tab>
                                )}
                                <Tabs.Tab value="all">All Photos</Tabs.Tab>
                                {otherCategories.map((c) => (
                                    <Tabs.Tab key={c.id} value={c.slug}>
                                        {c.name}
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    )}

                    {activeCategory === GUEST_PHOTOS_SLUG && (
                        <SegmentedControl
                            value={myUploadsOnly ? "mine" : "all"}
                            onChange={(v) => setMyUploadsOnly(v === "mine")}
                            data={[
                                { label: "All guest photos", value: "all" },
                                { label: "My uploads", value: "mine" },
                            ]}
                            size="xs"
                            w="fit-content"
                        />
                    )}

                    {loading && photos.length === 0 ? (
                        <Center py="xl">
                            <Loader color="yellow" />
                        </Center>
                    ) : photos.length === 0 ? (
                        <Center py="xl">
                            <Text c="dimmed">
                                {mineActive
                                    ? "You haven't uploaded any photos yet — tap Upload Photos to share some!"
                                    : personFilter
                                      ? "No photos of them here — try All Photos or another section."
                                      : "No photos yet — be the first to share!"}
                            </Text>
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
                on={{
                    view: ({ index }) => setLightboxIndex(index),
                    download: ({ index }) =>
                        trackEvent(GalleryEvents.DOWNLOAD_CLICKED, {
                            invitation_code: invitationCode,
                            photo_id: photos[index]?.id,
                            page: "gallery",
                        }),
                }}
                plugins={invitationCode ? [Captions, Download, Zoom] : [Captions, Zoom]}
                zoom={{ maxZoomPixelRatio: 2 }}
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

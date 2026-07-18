"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
    Container,
    Title,
    Text,
    TextInput,
    Button,
    Stack,
    Box,
    Group,
    Flex,
    Progress,
    Alert,
    Paper,
    SimpleGrid,
    ActionIcon,
    ThemeIcon,
} from "@mantine/core";
import { IconAlertCircle, IconUpload, IconX, IconCheck } from "@tabler/icons-react";
import { useSession } from "@/hooks/useSession";
import type { UploadUrlResponse } from "@/types/photos";

interface FileUploadState {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
}

const MAX_SIZE = 20 * 1024 * 1024;
// How many files upload at once — the rest queue behind them.
const UPLOAD_CONCURRENCY = 4;
const ALLOWED = ["image/jpeg", "image/png", "image/heic", "image/heif"];

// "Matthew", "Matthew and Jim", "Matthew, Jim and Sarah" — no Oxford comma.
function formatNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Some browsers report an empty MIME type for HEIC/HEIF files, so fall back
// to the file extension. The result is also used as the S3 Content-Type,
// which must match between the presign request and the actual upload.
function effectiveType(file: File): string {
    if (file.type) return file.type;
    const name = file.name.toLowerCase();
    if (name.endsWith(".heic")) return "image/heic";
    if (name.endsWith(".heif")) return "image/heif";
    return "";
}

export default function UploadPage() {
    const [code, setCode] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("invitation_code") ?? "";
        }
        return "";
    });
    const [codeInput, setCodeInput] = useState(code);
    const [codeValidated, setCodeValidated] = useState(!!code);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [names, setNames] = useState<string[]>([]);
    const [files, setFiles] = useState<FileUploadState[]>([]);
    const [uploading, setUploading] = useState(false);
    const [allDone, setAllDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { masterCode } = useSession();

    // Logged-in admins get the bride & groom's master code auto-filled, same
    // as on the gallery page (useSession resolves it; guests get null).
    useEffect(() => {
        if (code || !masterCode) return;
        localStorage.setItem("invitation_code", masterCode);
        setCode(masterCode);
        setCodeInput(masterCode);
        setCodeValidated(true);
    }, [code, masterCode]);

    // A code inherited from localStorage (personal link or a previous visit)
    // was never validated here — look it up to greet by name, and fall back
    // to code entry if it's no longer valid.
    useEffect(() => {
        if (!code) return;
        fetch("/api/photos/validate-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.valid) {
                    setNames(data.names ?? []);
                } else {
                    setCodeValidated(false);
                    setNames([]);
                }
            })
            .catch(() => {}); // greeting falls back to the code itself
    }, [code]);

    const validateCode = async () => {
        const trimmed = codeInput.trim().toUpperCase();
        if (trimmed.length !== 6) {
            setCodeError("Please enter your 6-character invitation code");
            return;
        }
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
        setCode(trimmed);
        setNames(data.names ?? []);
        setCodeValidated(true);
        setCodeError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        const valid = selected.filter((f) => {
            if (!ALLOWED.includes(effectiveType(f))) return false;
            if (f.size > MAX_SIZE) return false;
            return true;
        });
        setFiles((prev) => [
            ...prev,
            ...valid.map((f) => ({ file: f, progress: 0, status: "pending" as const })),
        ]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // Resolves to true only if the file made it to S3; never rejects.
    const uploadFile = useCallback(
        async (index: number, file: File): Promise<boolean> => {
            try {
                setFiles((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f))
                );

                const contentType = effectiveType(file);
                const urlRes = await fetch("/api/photos/upload-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code,
                        fileName: file.name,
                        contentType,
                        sizeBytes: file.size,
                    }),
                });

                if (!urlRes.ok) {
                    const data = await urlRes.json();
                    setFiles((prev) =>
                        prev.map((f, i) =>
                            i === index ? { ...f, status: "error", error: data.error ?? "Upload failed" } : f
                        )
                    );
                    return false;
                }

                const { uploadUrl }: UploadUrlResponse = await urlRes.json();

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.upload.addEventListener("progress", (ev) => {
                        if (ev.lengthComputable) {
                            const pct = Math.round((ev.loaded / ev.total) * 100);
                            setFiles((prev) =>
                                prev.map((f, i) => (i === index ? { ...f, progress: pct } : f))
                            );
                        }
                    });
                    xhr.addEventListener("load", () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setFiles((prev) =>
                                prev.map((f, i) =>
                                    i === index ? { ...f, status: "done", progress: 100 } : f
                                )
                            );
                            resolve();
                        } else {
                            reject(new Error(`S3 upload failed: ${xhr.status}`));
                        }
                    });
                    xhr.addEventListener("error", () => reject(new Error("Network error")));
                    xhr.open("PUT", uploadUrl);
                    xhr.setRequestHeader("Content-Type", contentType);
                    xhr.send(file);
                });
                return true;
            } catch (err) {
                setFiles((prev) =>
                    prev.map((f, i) =>
                        i === index
                            ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
                            : f
                    )
                );
                return false;
            }
        },
        [code]
    );

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        const pending = files
            .map((f, i) => ({ f, i }))
            .filter(({ f }) => f.status === "pending");
        // Upload in small batches — with no cap on the number of photos, a
        // huge selection shouldn't fire hundreds of parallel requests.
        const results: boolean[] = [];
        for (let i = 0; i < pending.length; i += UPLOAD_CONCURRENCY) {
            results.push(
                ...(await Promise.all(
                    pending.slice(i, i + UPLOAD_CONCURRENCY).map(({ f, i: idx }) => uploadFile(idx, f.file))
                ))
            );
        }
        setUploading(false);
        // Only celebrate if at least one file actually made it; otherwise the
        // failed files stay listed with their per-file error messages.
        if (results.some(Boolean)) {
            setAllDone(true);
        }
    };

    // Back from the success screen: drop uploaded files, reset any failed
    // ones so they can be retried.
    const resetForMoreUploads = () => {
        setFiles((prev) =>
            prev
                .filter((f) => f.status !== "done")
                .map((f) => ({ file: f.file, progress: 0, status: "pending" as const }))
        );
        setAllDone(false);
    };

    return (
        <main id="main-content">
            <Container size="sm" py="xl">
                <Stack gap="xl">
                    <Box ta={{ base: "center", sm: "left" }}>
                        <Title
                            order={1}
                            style={{
                                fontFamily: "var(--font-playfair), serif",
                                fontWeight: 300,
                                color: "var(--gold-dark)",
                                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                            }}
                        >
                            Share Your Photos
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Share as many photos as you like. JPEG, PNG, or HEIC — max 20 MB each.
                        </Text>
                    </Box>

                    {allDone ? (
                        <Paper p="xl" radius="md" withBorder>
                            <Stack gap="md" align="center" style={{ textAlign: "center" }}>
                                <ThemeIcon size={56} radius="xl" color="green" variant="light">
                                    <IconCheck size={32} />
                                </ThemeIcon>
                                <Title
                                    order={2}
                                    style={{
                                        fontFamily: "var(--font-playfair), serif",
                                        fontWeight: 300,
                                        color: "var(--gold-dark)",
                                    }}
                                >
                                    Thank you!
                                </Title>
                                <Text c="dimmed">
                                    Your {files.filter((f) => f.status === "done").length === 1
                                        ? "photo has"
                                        : "photos have"}{" "}
                                    been uploaded. Matthew and Becca will review and approve them
                                    shortly — they&apos;ll appear in the gallery once approved.
                                </Text>
                                {files.some((f) => f.status === "error") && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        color="orange"
                                        variant="light"
                                    >
                                        {files.filter((f) => f.status === "error").length} photo
                                        {files.filter((f) => f.status === "error").length !== 1 && "s"}{" "}
                                        failed to upload — you can retry below.
                                    </Alert>
                                )}
                                {/* Full-width stacked on phones (thumb-sized
                                    targets), inline and centred otherwise. */}
                                <Flex
                                    direction={{ base: "column", xs: "row" }}
                                    gap="sm"
                                    justify="center"
                                    w="100%"
                                >
                                    <Button color="yellow" onClick={resetForMoreUploads}>
                                        Upload more photos
                                    </Button>
                                    <Button component={Link} href="/gallery" variant="light" color="yellow">
                                        View the gallery
                                    </Button>
                                </Flex>
                            </Stack>
                        </Paper>
                    ) : !codeValidated ? (
                        <Paper p="lg" radius="md" withBorder>
                            <Stack gap="sm">
                                <Text fw={500}>Your invitation code</Text>
                                <Text size="sm" c="dimmed">
                                    Enter the 6-character code from your invitation to upload photos.
                                </Text>
                                <TextInput
                                    placeholder="e.g. ABC123"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.currentTarget.value.toUpperCase())}
                                    maxLength={6}
                                    error={codeError}
                                    styles={{ input: { textTransform: "uppercase", letterSpacing: "0.1em" } }}
                                />
                                <Button onClick={validateCode} color="yellow">
                                    Continue
                                </Button>
                            </Stack>
                        </Paper>
                    ) : (
                        <Stack gap="md">
                            <Group justify="space-between" align="center">
                                <Text size="sm" c="dimmed">
                                    Uploading as <strong>{names.length > 0 ? formatNames(names) : code}</strong>
                                </Text>
                                <Button size="xs" variant="subtle" color="gray" onClick={() => setCodeValidated(false)}>
                                    Change code
                                </Button>
                            </Group>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                                multiple
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            <Button
                                leftSection={<IconUpload size={16} />}
                                variant="outline"
                                color="yellow"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                Choose photos {files.length > 0 && `(${files.length} selected)`}
                            </Button>

                            {files.length > 0 && (
                                <SimpleGrid cols={1} spacing="xs">
                                    {files.map((f, i) => (
                                        <Paper key={i} p="sm" radius="sm" withBorder>
                                            <Group justify="space-between" mb={f.status === "uploading" ? "xs" : 0}>
                                                <Group gap="xs">
                                                    {f.status === "done" && <IconCheck size={16} color="green" />}
                                                    {f.status === "error" && <IconAlertCircle size={16} color="red" />}
                                                    <Text size="sm" truncate style={{ maxWidth: 280 }}>
                                                        {f.file.name}
                                                    </Text>
                                                </Group>
                                                {f.status === "pending" && (
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => removeFile(i)}
                                                        disabled={uploading}
                                                    >
                                                        <IconX size={14} />
                                                    </ActionIcon>
                                                )}
                                            </Group>
                                            {f.status === "uploading" && (
                                                <Progress value={f.progress} color="yellow" size="sm" animated />
                                            )}
                                            {f.status === "error" && (
                                                <Text size="xs" c="red" mt={4}>
                                                    {f.error}
                                                </Text>
                                            )}
                                        </Paper>
                                    ))}
                                </SimpleGrid>
                            )}

                            {files.filter((f) => f.status === "pending").length > 0 && (
                                <Button
                                    color="yellow"
                                    onClick={handleUpload}
                                    loading={uploading}
                                >
                                    Upload {files.filter((f) => f.status === "pending").length} photo
                                    {files.filter((f) => f.status === "pending").length !== 1 ? "s" : ""}
                                </Button>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Container>
        </main>
    );
}

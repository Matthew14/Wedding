"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Container,
    Title,
    Text,
    TextInput,
    Button,
    Stack,
    Box,
    Group,
    Progress,
    Alert,
    Paper,
    SimpleGrid,
    ActionIcon,
} from "@mantine/core";
import { IconAlertCircle, IconUpload, IconX, IconCheck } from "@tabler/icons-react";
import type { UploadUrlResponse } from "@/types/photos";

interface FileUploadState {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
}

const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/heic"];

export default function UploadPage() {
    const router = useRouter();
    const [code, setCode] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("invitation_code") ?? "";
        }
        return "";
    });
    const [codeInput, setCodeInput] = useState(code);
    const [codeValidated, setCodeValidated] = useState(!!code);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [files, setFiles] = useState<FileUploadState[]>([]);
    const [uploading, setUploading] = useState(false);
    const [allDone, setAllDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        setCodeValidated(true);
        setCodeError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        const valid = selected.filter((f) => {
            if (!ALLOWED.includes(f.type)) return false;
            if (f.size > MAX_SIZE) return false;
            return true;
        });
        const capped = valid.slice(0, MAX_FILES - files.length);
        setFiles((prev) => [
            ...prev,
            ...capped.map((f) => ({ file: f, progress: 0, status: "pending" as const })),
        ]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadFile = useCallback(
        (index: number, file: File): Promise<void> => {
            return new Promise<void>(async (resolve) => {
                try {
                    setFiles((prev) =>
                        prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f))
                    );

                    const urlRes = await fetch("/api/photos/upload-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            code,
                            fileName: file.name,
                            contentType: file.type,
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
                        resolve();
                        return;
                    }

                    const { uploadUrl }: UploadUrlResponse = await urlRes.json();

                    await new Promise<void>((res2, rej) => {
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
                                res2();
                            } else {
                                rej(new Error(`S3 upload failed: ${xhr.status}`));
                            }
                        });
                        xhr.addEventListener("error", () => rej(new Error("Network error")));
                        xhr.open("PUT", uploadUrl);
                        xhr.setRequestHeader("Content-Type", file.type);
                        xhr.send(file);
                    });
                } catch (err) {
                    setFiles((prev) =>
                        prev.map((f, i) =>
                            i === index
                                ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
                                : f
                        )
                    );
                }
                resolve();
            });
        },
        [code]
    );

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        const pending = files
            .map((f, i) => ({ f, i }))
            .filter(({ f }) => f.status === "pending");
        await Promise.all(pending.map(({ f, i }) => uploadFile(i, f.file)));
        setUploading(false);
        setAllDone(true);
        setTimeout(() => router.push("/gallery"), 2000);
    };

    return (
        <main id="main-content">
            <Container size="sm" py="xl">
                <Stack gap="xl">
                    <Box>
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
                            Upload up to 10 photos. JPEG, PNG, or HEIC — max 20 MB each.
                        </Text>
                    </Box>

                    {!codeValidated ? (
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
                                    Uploading as <strong>{code}</strong>
                                </Text>
                                <Button size="xs" variant="subtle" color="gray" onClick={() => setCodeValidated(false)}>
                                    Change code
                                </Button>
                            </Group>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/heic"
                                multiple
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            {files.length < MAX_FILES && (
                                <Button
                                    leftSection={<IconUpload size={16} />}
                                    variant="outline"
                                    color="yellow"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    Choose photos {files.length > 0 && `(${files.length} selected)`}
                                </Button>
                            )}

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

                            {allDone && (
                                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                                    Photos uploaded! Redirecting to gallery…
                                </Alert>
                            )}

                            {files.filter((f) => f.status === "pending").length > 0 && (
                                <Button
                                    color="yellow"
                                    onClick={handleUpload}
                                    loading={uploading}
                                    disabled={allDone}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Paper, TextInput, PasswordInput, Button, Title, Text, Alert, Stack, Box } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const { error: msg } = await res.json();
                setError(msg ?? "Sign in failed");
                setLoading(false);
                return;
            }

            router.push("/dashboard");
        } catch {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: "100vh",
                backgroundColor: "#f8f9fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
        >
            <Container size="xs">
                <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: "#ffffff" }}>
                    <Stack gap="lg">
                        <Box style={{ textAlign: "center" }}>
                            <Title
                                order={1}
                                style={{
                                    fontSize: "clamp(1.8rem, 5vw, 2.2rem)",
                                    fontWeight: 300,
                                    color: "#495057",
                                    marginBottom: "0.5rem",
                                    fontFamily: "serif",
                                }}
                            >
                                Wedding Dashboard
                            </Title>
                            <Text size="md" c="dimmed">
                                Sign in to access the admin panel
                            </Text>
                        </Box>

                        {error && (
                            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Stack gap="md">
                                <TextInput
                                    label="Email"
                                    placeholder="Enter your email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    styles={{
                                        label: { color: "#495057", fontWeight: 500 },
                                        input: { borderColor: "#dee2e6" },
                                    }}
                                />

                                <PasswordInput
                                    label="Password"
                                    placeholder="Enter your password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    styles={{
                                        label: { color: "#495057", fontWeight: 500 },
                                        input: { borderColor: "#dee2e6" },
                                    }}
                                />

                                <Button
                                    type="submit"
                                    size="lg"
                                    loading={loading}
                                    fullWidth
                                    style={{
                                        backgroundColor: "#8b7355",
                                        borderColor: "#8b7355",
                                        marginTop: "1rem",
                                    }}
                                >
                                    Sign In
                                </Button>
                            </Stack>
                        </form>

                        <Text size="xs" c="dimmed" style={{ textAlign: "center" }}>
                            Access restricted to authorized users only
                        </Text>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

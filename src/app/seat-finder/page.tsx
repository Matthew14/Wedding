"use client";

import { useState, useEffect, useRef } from "react";
import { Container, Title, Text, Box, Autocomplete, Loader, Stack, Alert } from "@mantine/core";
import { IconSearch, IconUsers, IconAlertCircle } from "@tabler/icons-react";
import { Navigation } from "@/components/Navigation";

interface Suggestion {
    id: number;
    name: string;
}

interface PartyMember {
    id: number;
    first_name: string;
    last_name: string;
    is_primary: boolean;
}

export default function SeatFinderPage() {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [party, setParty] = useState<PartyMember[] | null>(null);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [loadingParty, setLoadingParty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nameToIdRef = useRef<Map<string, number>>(new Map());
    const justSelectedRef = useRef(false);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return () => {};
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/seat-finder/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error("Search failed");
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                nameToIdRef.current = new Map(data.map((s) => [s.name, s.id]));
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    useEffect(() => {
        if (party && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
        }
    }, [party]);

    async function handleSelect(name: string) {
        justSelectedRef.current = true;
        setQuery(name);
        setSuggestions([]);
        setError(null);

        const id = nameToIdRef.current.get(name);
        if (!id) return;

        setLoadingParty(true);
        setParty(null);
        setSelectedName(name);

        try {
            const res = await fetch(`/api/seat-finder/party?id=${id}`);
            if (!res.ok) throw new Error("Failed to load party");
            const data = await res.json();
            setParty(data.party ?? null);
        } catch {
            setParty(null);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoadingParty(false);
        }
    }

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box
                    style={{
                        paddingTop: 56,
                        minHeight: "100vh",
                        background: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
                    }}
                >
                    <Container size="sm" px="md">
                        {/* Header */}
                        <Box style={{ paddingTop: "clamp(1.5rem, 5vw, 3rem)", paddingBottom: "1.75rem" }}>
                            <Title
                                order={1}
                                style={{
                                    fontFamily: "var(--font-playfair), serif",
                                    fontSize: "clamp(1.75rem, 7vw, 3rem)",
                                    fontWeight: 400,
                                    color: "var(--text-primary)",
                                    marginBottom: "0.5rem",
                                    lineHeight: 1.2,
                                }}
                            >
                                Seat Finder
                            </Title>
                            <Text
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "clamp(0.875rem, 3.5vw, 1rem)",
                                    lineHeight: 1.5,
                                }}
                            >
                                Search for your name to find your party&apos;s seating.
                            </Text>
                        </Box>

                        {/* Search */}
                        <Autocomplete
                            value={query}
                            onChange={setQuery}
                            onOptionSubmit={handleSelect}
                            data={suggestions.map((s) => s.name)}
                            filter={({ options }) => options}
                            placeholder="Search your name…"
                            inputMode="search"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            leftSection={
                                searching ? (
                                    <Loader size={18} color="var(--gold)" />
                                ) : (
                                    <IconSearch size={18} color="var(--text-secondary)" />
                                )
                            }
                            size="lg"
                            styles={{
                                input: {
                                    fontSize: 16,
                                    height: 52,
                                    borderColor: "rgba(139, 115, 85, 0.3)",
                                    borderRadius: 8,
                                    paddingLeft: 48,
                                    backgroundColor: "white",
                                },
                                option: {
                                    minHeight: 48,
                                    fontSize: 16,
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 1rem",
                                },
                                dropdown: {
                                    borderRadius: 8,
                                    border: "1px solid rgba(139, 115, 85, 0.2)",
                                    boxShadow: "0 4px 20px rgba(139, 115, 85, 0.12)",
                                },
                            }}
                        />

                        {/* Loading */}
                        {loadingParty && (
                            <Box style={{ display: "flex", justifyContent: "center", paddingTop: "2.5rem" }}>
                                <Loader color="var(--gold)" size="md" />
                            </Box>
                        )}

                        {/* Error */}
                        {error && !loadingParty && (
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                color="red"
                                variant="light"
                                mt="md"
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Results */}
                        {party && !loadingParty && (
                            <Box
                                ref={resultsRef}
                                style={{
                                    marginTop: "1.25rem",
                                    marginBottom: "2rem",
                                    background: "white",
                                    borderRadius: 12,
                                    padding: "clamp(1.25rem, 5vw, 1.75rem)",
                                    border: "1px solid rgba(139, 115, 85, 0.15)",
                                    boxShadow: "0 4px 20px rgba(139, 115, 85, 0.1)",
                                }}
                            >
                                <Box
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <IconUsers size={16} color="var(--gold-dark)" />
                                    <Text
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--gold-dark)",
                                            letterSpacing: "0.12em",
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {selectedName}&apos;s Party
                                    </Text>
                                </Box>
                                <Stack gap={0}>
                                    {party.map((member, i) => (
                                        <Box
                                            key={member.id}
                                            style={{
                                                padding: "0.75rem 0",
                                                borderTop: i > 0 ? "1px solid rgba(139, 115, 85, 0.08)" : "none",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "var(--text-primary)",
                                                    fontSize: "clamp(1rem, 4vw, 1.1rem)",
                                                    fontWeight: member.is_primary ? 500 : 400,
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {member.first_name} {member.last_name}
                                            </Text>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Container>
                </Box>
            </main>
        </>
    );
}

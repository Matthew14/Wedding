"use client";

import { useState, useEffect, useRef } from "react";
import { Container, Title, Text, Box, Autocomplete, Loader, Stack } from "@mantine/core";
import { IconSearch, IconUsers } from "@tabler/icons-react";
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
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nameToIdRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/seat-finder/search?q=${encodeURIComponent(query)}`);
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                nameToIdRef.current = new Map(data.map((s) => [s.name, s.id]));
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [query]);

    async function handleSelect(name: string) {
        setQuery(name);
        setSuggestions([]);

        const id = nameToIdRef.current.get(name);
        if (!id) return;

        setLoadingParty(true);
        setParty(null);
        setSelectedName(name);

        try {
            const res = await fetch(`/api/seat-finder/party?id=${id}`);
            const data = await res.json();
            setParty(data.party ?? null);
        } catch {
            setParty(null);
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
                    <Container size="sm" py="xl">
                        <Box style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
                            <Text
                                style={{
                                    fontSize: "0.85rem",
                                    color: "var(--gold)",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                    marginBottom: "0.75rem",
                                }}
                            >
                                Find Your Seat
                            </Text>
                            <Title
                                order={1}
                                style={{
                                    fontFamily: "var(--font-playfair), serif",
                                    fontSize: "clamp(2rem, 6vw, 3rem)",
                                    fontWeight: 400,
                                    color: "var(--text-primary)",
                                    marginBottom: "0.75rem",
                                }}
                            >
                                Seat Finder
                            </Title>
                            <Text style={{ color: "var(--text-secondary)", marginBottom: "2.5rem" }}>
                                Search for your name to see your party&apos;s seating.
                            </Text>

                            <Autocomplete
                                value={query}
                                onChange={setQuery}
                                onOptionSubmit={handleSelect}
                                data={suggestions.map((s) => s.name)}
                                filter={({ options }) => options}
                                placeholder="Search your name…"
                                leftSection={
                                    searching ? <Loader size={16} color="var(--gold)" /> : <IconSearch size={16} />
                                }
                                size="md"
                                styles={{
                                    input: {
                                        borderColor: "rgba(139, 115, 85, 0.3)",
                                        "&:focus": { borderColor: "var(--gold)" },
                                    },
                                }}
                            />
                        </Box>

                        {loadingParty && (
                            <Box style={{ display: "flex", justifyContent: "center", paddingTop: "2rem" }}>
                                <Loader color="var(--gold)" />
                            </Box>
                        )}

                        {party && !loadingParty && (
                            <Box
                                style={{
                                    background: "white",
                                    borderRadius: 8,
                                    padding: "1.75rem",
                                    border: "1px solid rgba(139, 115, 85, 0.15)",
                                    boxShadow: "0 2px 12px rgba(139, 115, 85, 0.08)",
                                }}
                            >
                                <Box
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        marginBottom: "1.25rem",
                                    }}
                                >
                                    <IconUsers size={18} color="var(--gold-dark)" />
                                    <Text
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "var(--gold-dark)",
                                            letterSpacing: "0.12em",
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {selectedName}&apos;s Party
                                    </Text>
                                </Box>
                                <Stack gap="xs">
                                    {party.map((member) => (
                                        <Text
                                            key={member.id}
                                            style={{
                                                color: "var(--text-primary)",
                                                fontSize: "1.05rem",
                                                fontWeight: member.is_primary ? 500 : 400,
                                            }}
                                        >
                                            {member.first_name} {member.last_name}
                                        </Text>
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

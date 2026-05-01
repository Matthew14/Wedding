"use client";

import { useState, useEffect, useRef } from "react";
import { Container, Title, Text, Box, Autocomplete, Loader, Stack, Alert } from "@mantine/core";
import { IconSearch, IconUsers, IconAlertCircle } from "@tabler/icons-react";
import { Navigation } from "@/components/Navigation";
import { SeatingMap } from "./SeatingMap";

interface Suggestion {
    id: string;
    name: string;
}

interface PartyMember {
    id: string;
    first_name: string;
    last_name: string;
    is_primary: boolean;
    table_number: string | null;
    seat_number: number | null;
}

export default function SeatFinderPage() {
    const [allSeats, setAllSeats] = useState<{ tableNumber: string; seatNumber: number; name: string }[]>([]);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [party, setParty] = useState<PartyMember[] | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    type TappedSeat = { name: string; tableNumber: string; seatNumber: number };
    const [tappedSeat, setTappedSeat] = useState<TappedSeat | null>(null);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [loadingParty, setLoadingParty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nameToIdRef = useRef<Map<string, string>>(new Map());
    const justSelectedRef = useRef(false);
    const resultsRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/seat-finder/seats")
            .then((r) => r.ok ? r.json() : [])
            .then(setAllSeats)
            .catch(() => {});
    }, []);

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
        searchInputRef.current?.blur();
        setError(null);

        const id = nameToIdRef.current.get(name);
        if (!id) return;

        setLoadingParty(true);
        setParty(null);
        setSelectedId(id);
        setTappedSeat(null);
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

    const highlightedSeats = party
        ? party
              .filter((m) => m.table_number && m.seat_number)
              .map((m) => ({
                  tableNumber: m.table_number!,
                  seatNumber: m.seat_number!,
                  isOwn: m.id === selectedId,
                  name: `${m.first_name} ${m.last_name}`,
              }))
        : [];

    const seatedMembers = party?.filter((m) => m.table_number) ?? [];
    const tableNumber = seatedMembers[0]?.table_number ?? null;
    const primaryMember = party?.find((m) => m.is_primary);
    const partyLabel = primaryMember
        ? `${primaryMember.first_name} ${primaryMember.last_name}`
        : selectedName;

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
                            ref={searchInputRef}
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
                            <Box ref={resultsRef} style={{ marginTop: "1.25rem", marginBottom: "2rem" }}>
                                {/* Seating map */}
                                {highlightedSeats.length > 0 && (
                                    <Box
                                        style={{
                                            background: "white",
                                            borderRadius: 12,
                                            padding: "1rem",
                                            border: "1px solid rgba(139, 115, 85, 0.15)",
                                            boxShadow: "0 4px 20px rgba(139, 115, 85, 0.1)",
                                        }}
                                    >
                                        <Box style={{ position: "relative" }}>
                                            <SeatingMap
                                                allSeats={allSeats}
                                                highlightedSeats={highlightedSeats}
                                                onSeatClick={setTappedSeat}
                                            />
                                            {tappedSeat && (
                                                <Box
                                                    onClick={() => setTappedSeat(null)}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        background: "rgba(240,235,224,0.75)",
                                                        borderRadius: 8,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <Box
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: "white",
                                                            borderRadius: 10,
                                                            padding: "1rem 1.5rem",
                                                            boxShadow: "0 4px 24px rgba(139,115,85,0.2)",
                                                            border: "1px solid rgba(139,115,85,0.15)",
                                                            textAlign: "center",
                                                            minWidth: 180,
                                                        }}
                                                    >
                                                        <Text style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                                                            {tappedSeat.name}
                                                        </Text>
                                                        {tappedSeat.tableNumber && (
                                                            <Text style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                                                Table {tappedSeat.tableNumber}
                                                                {" · "}Seat {tappedSeat.seatNumber}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                        {/* Legend */}
                                        <Box style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: "0.75rem" }}>
                                            <Box style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <svg width={16} height={16}><circle cx={8} cy={8} r={7} fill="#c9a84c" stroke="#6d5a44" strokeWidth={1.5} /></svg>
                                                <Text style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Your seat</Text>
                                            </Box>
                                            {party.length > 1 && (
                                                <Box style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                    <svg width={16} height={16}><circle cx={8} cy={8} r={7} fill="rgba(201,168,76,0.4)" stroke="#c9a84c" strokeWidth={1.5} /></svg>
                                                    <Text style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Your party</Text>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                )}

                                {/* Party card */}
                                <Box
                                    style={{
                                        background: "white",
                                        borderRadius: 12,
                                        padding: "0.75rem 1rem",
                                        border: "1px solid rgba(139, 115, 85, 0.15)",
                                        boxShadow: "0 4px 20px rgba(139, 115, 85, 0.1)",
                                        marginTop: "1rem",
                                    }}
                                >
                                    <Box
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <Box style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            {party.length > 1 && <IconUsers size={14} color="var(--gold-dark)" />}
                                            <Text
                                                style={{
                                                    fontSize: "0.7rem",
                                                    color: "var(--gold-dark)",
                                                    letterSpacing: "0.12em",
                                                    textTransform: "uppercase",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {party.length > 1 ? <>{partyLabel}&apos;s Party</> : selectedName}
                                            </Text>
                                        </Box>
                                        {tableNumber && (
                                            <Text
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "var(--gold-dark)",
                                                    fontWeight: 600,
                                                    background: "rgba(201,168,76,0.12)",
                                                    border: "1px solid rgba(201,168,76,0.3)",
                                                    borderRadius: 6,
                                                    padding: "0.15rem 0.5rem",
                                                }}
                                            >
                                                Table {tableNumber}
                                            </Text>
                                        )}
                                    </Box>
                                    <Stack gap={0}>
                                        {party.map((member, i) => (
                                            <Box
                                                key={member.id}
                                                style={{
                                                    padding: "0.4rem 0",
                                                    borderTop: i > 0 ? "1px solid rgba(139, 115, 85, 0.08)" : "none",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: member.id === selectedId ? "var(--text-primary)" : "var(--text-secondary)",
                                                        fontSize: "0.95rem",
                                                        fontWeight: member.id === selectedId ? 600 : 400,
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    {member.first_name} {member.last_name}
                                                    {party.length > 1 && member.id === selectedId && (
                                                        <Text component="span" style={{ fontSize: "0.7rem", color: "var(--gold-dark)", marginLeft: "0.4rem", fontWeight: 400 }}>
                                                            (you)
                                                        </Text>
                                                    )}
                                                </Text>
                                                {member.seat_number && (
                                                    <Text style={{ fontSize: "0.75rem", color: "var(--text-secondary)", flexShrink: 0, marginLeft: "0.5rem" }}>
                                                        Seat {member.seat_number}
                                                    </Text>
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </Box>
                        )}
                    </Container>
                </Box>
            </main>
        </>
    );
}

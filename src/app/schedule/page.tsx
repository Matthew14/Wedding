import { Suspense } from "react";
import { Container, Title, Text, Box } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import {
    IconHeart,
    IconGlass,
    IconMusic,
    IconPool,
    IconChefHat,
    IconToolsKitchen2,
    IconDoor,
    IconDoorEnter,
    IconStar,
} from "@tabler/icons-react";
import BackToInvitation from "./BackToInvitation";

interface TimelineEvent {
    time?: string;
    endTime?: string;
    title: string;
    location?: string;
    icon: React.ReactNode;
}

interface DaySchedule {
    day: string;
    title: string;
    bgColor: string;
    accentColor: string;
    events: TimelineEvent[];
}

const schedule: DaySchedule[] = [
    {
        day: "Day 1 — Arrival Day",
        title: "Welcome",
        bgColor: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
        accentColor: "var(--gold)",
        events: [
            {
                time: "14:00",
                title: "Check-in",
                icon: <IconDoorEnter size={20} />,
            },
            {
                time: "14:30",
                endTime: "16:30",
                title: "Welcome Lunch",
                icon: <IconChefHat size={20} />,
            },
            {
                time: "19:00",
                endTime: "22:00",
                title: "Tapas Night",
                location: "Mimosa tree",
                icon: <IconToolsKitchen2 size={20} />,
            },
        ],
    },
    {
        day: "Day 2 — Wedding Day",
        title: "The Wedding",
        bgColor: "linear-gradient(135deg, #fdfcfa 0%, #f5f0e8 100%)",
        accentColor: "var(--gold-dark)",
        events: [
            {
                time: "09:00",
                endTime: "10:00",
                title: "Breakfast",
                icon: <IconChefHat size={20} />,
            },
            {
                time: "12:00",
                endTime: "13:00",
                title: "Lunch",
                icon: <IconToolsKitchen2 size={20} />,
            },
            {
                time: "14:30",
                endTime: "15:00",
                title: "Welcome Cava",
                icon: <IconGlass size={20} />,
            },
            {
                time: "15:00",
                endTime: "16:00",
                title: "Wedding Ceremony",
                location: "Arch",
                icon: <IconHeart size={20} />,
            },
            {
                time: "16:30",
                endTime: "17:30",
                title: "Appetizers at the Piazza",
                icon: <IconGlass size={20} />,
            },
            {
                time: "18:00",
                endTime: "21:00",
                title: "Wedding Dinner",
                location: "Palm Trees",
                icon: <IconToolsKitchen2 size={20} />,
            },
            {
                time: "21:00",
                endTime: "23:00",
                title: "Live Band",
                location: "Laguna Bar",
                icon: <IconMusic size={20} />,
            },
            {
                time: "00:00",
                endTime: "03:00",
                title: "Night Club Party",
                location: "Night Club",
                icon: <IconStar size={20} />,
            },
        ],
    },
    {
        day: "Day 3 — Departure Day",
        title: "Farewell",
        bgColor: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
        accentColor: "var(--gold)",
        events: [
            {
                time: "08:00",
                endTime: "10:00",
                title: "Breakfast",
                icon: <IconChefHat size={20} />,
            },
            {
                time: "11:00",
                endTime: "13:00",
                title: "Pool party & BBQ",
                icon: <IconPool size={20} />,
            },
            {
                time: "13:00",
                title: "Depart",
                icon: <IconDoor size={20} />,
            },
        ],
    },
];

export default function SchedulePage() {
    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Suspense fallback={null}>
                        <BackToInvitation />
                    </Suspense>
                    {/* Day Sections */}
                    {schedule.map((day, index) => (
                        <Box
                            key={index}
                            style={{
                                background: day.bgColor,
                                padding: "4rem 0",
                                borderTop: index > 0 ? "1px solid rgba(139, 115, 85, 0.1)" : "none",
                            }}
                        >
                            <Container size="md">
                                <Box style={{ marginBottom: "2.5rem" }}>
                                    <Text
                                        style={{
                                            fontSize: "0.85rem",
                                            color: day.accentColor,
                                            letterSpacing: "0.15em",
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                            marginBottom: "0.75rem",
                                        }}
                                    >
                                        {day.day}
                                    </Text>
                                    <Title
                                        order={2}
                                        style={{
                                            color: "var(--text-primary)",
                                            fontFamily: "var(--font-playfair), serif",
                                            fontSize: "clamp(2rem, 6vw, 3rem)",
                                            fontWeight: 400,
                                        }}
                                    >
                                        {day.title}
                                    </Title>
                                </Box>

                                <Box
                                    style={{
                                        borderLeft: `2px solid rgba(139, 115, 85, 0.2)`,
                                        marginLeft: 10,
                                        paddingLeft: 0,
                                    }}
                                >
                                    {day.events.map((event, eventIndex) => (
                                        <Box
                                            key={eventIndex}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: "1rem",
                                                padding: "0.75rem 0 0.75rem 1.5rem",
                                                cursor: "default",
                                            }}
                                        >
                                            <Box
                                                style={{
                                                    color: day.accentColor,
                                                    flexShrink: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    paddingTop: "0.15rem",
                                                }}
                                            >
                                                {event.icon}
                                            </Box>
                                            <Box>
                                                <Text
                                                    style={{
                                                        color: "var(--text-primary)",
                                                        fontSize: "1.05rem",
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    {event.time && (
                                                        <span style={{ color: day.accentColor, fontWeight: 500 }}>
                                                            {event.time}
                                                            {event.endTime ? `–${event.endTime}` : ""} —{" "}
                                                        </span>
                                                    )}
                                                    {event.title}
                                                </Text>
                                                {event.location && (
                                                    <Text
                                                        style={{
                                                            fontSize: "0.875rem",
                                                            color: "var(--text-secondary)",
                                                            marginTop: "0.1rem",
                                                        }}
                                                    >
                                                        {event.location}
                                                    </Text>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Container>
                        </Box>
                    ))}

                    {/* Footer Heart */}
                    <Box style={{ textAlign: "center", padding: "3rem 0" }}>
                        <IconHeart size={32} color="var(--gold-dark)" />
                    </Box>
                </Box>
            </main>
        </>
    );
}

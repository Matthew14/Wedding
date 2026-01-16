import { Suspense } from "react";
import { Container, Title, Text, Stack, Box } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import {
    IconHeart,
    IconGlass,
    IconMusic,
    IconPool,
    IconMicrophone2,
    IconChefHat,
    IconToolsKitchen2,
    IconDoor,
    IconDoorEnter,
} from "@tabler/icons-react";
import BackToInvitation from "./BackToInvitation";

interface TimelineEvent {
    time?: string;
    title: string;
    icon: React.ReactNode;
}

interface DaySchedule {
    day: string;
    date: string;
    title: string;
    bgColor: string;
    accentColor: string;
    events: TimelineEvent[];
}

const schedule: DaySchedule[] = [
    {
        day: "Day One",
        date: "Friday",
        title: "Welcome",
        bgColor: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
        accentColor: "var(--gold)",
        events: [
            { time: "14:00", title: "Check in for staying guests", icon: <IconDoorEnter size={20} /> },
            { title: "Pool Bar & BBQ", icon: <IconPool size={20} /> },
            { title: "Evening dinner", icon: <IconToolsKitchen2 size={20} /> },
            { title: "Live entertainment", icon: <IconMusic size={20} /> },
        ],
    },
    {
        day: "Day Two",
        date: "Saturday",
        title: "The Wedding",
        bgColor: "linear-gradient(135deg, #fdfcfa 0%, #f5f0e8 100%)",
        accentColor: "var(--gold-dark)",
        events: [
            { title: "Breakfast", icon: <IconChefHat size={20} /> },
            { title: "Pre-Ceremony appetisers", icon: <IconGlass size={20} /> },
            { title: "The Ceremony", icon: <IconHeart size={20} /> },
            { title: "Reception Dinner", icon: <IconToolsKitchen2 size={20} /> },
            { title: "Live band at Laguna Stage", icon: <IconMicrophone2 size={20} /> },
            { title: "DJ & dancing", icon: <IconMusic size={20} /> },
        ],
    },
    {
        day: "Day Three",
        date: "Sunday",
        title: "Farewell",
        bgColor: "linear-gradient(135deg, #f9f7f2 0%, #f0ebe0 100%)",
        accentColor: "var(--gold)",
        events: [
            { title: "Breakfast", icon: <IconChefHat size={20} /> },
            { title: "Pool party & BBQ lunch", icon: <IconPool size={20} /> },
            { time: "Afternoon", title: "Check out", icon: <IconDoor size={20} /> },
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
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        {day.day} — {day.date}
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

                                <Stack gap="sm">
                                    {day.events.map((event, eventIndex) => (
                                        <Box
                                            key={eventIndex}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "1rem",
                                                padding: "1rem 1.5rem",
                                                backgroundColor: "rgba(255, 255, 255, 0.7)",
                                                borderRadius: 12,
                                                boxShadow: "0 2px 8px rgba(139, 115, 85, 0.08)",
                                            }}
                                        >
                                            {/* Icon */}
                                            <Box
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: "50%",
                                                    backgroundColor: "rgba(139, 115, 85, 0.1)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: day.accentColor,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {event.icon}
                                            </Box>
                                            {/* Content */}
                                            <Box style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: "var(--text-primary)",
                                                        fontSize: "1.05rem",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {event.time && (
                                                        <span style={{ color: day.accentColor, marginRight: "0.5rem" }}>
                                                            {event.time} —
                                                        </span>
                                                    )}
                                                    {event.title}
                                                </Text>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
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

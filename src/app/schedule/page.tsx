import { Container, Title, Text, Stack, Box, Card, ThemeIcon, Group } from "@mantine/core";
import { Navigation } from "@/components/Navigation";
import {
    IconHeart,
    IconClock,
    IconCalendar,
    IconGlass,
    IconMusic,
    IconPool,
    IconMicrophone2,
    IconChefHat,
    IconSun,
    IconToolsKitchen2,
} from "@tabler/icons-react";

export default function SchedulePage() {
    return (
        <>
            <Navigation />
            <main id="main-content">
                <Box style={{ paddingTop: 56 }}>
                    <Container size="lg" py="xl" className="fade-in">
                        <Stack gap="xl">
                            <Box style={{ textAlign: "center", marginBottom: "2rem" }}>
                                <Title
                                    order={1}
                                    style={{
                                        color: "var(--text-primary)",
                                        marginBottom: "0",
                                        fontFamily: "var(--font-playfair), serif",
                                        fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
                                        fontWeight: 400,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    Wedding Schedule
                                </Title>
                                <div className="decorative-divider" style={{ margin: "1.5rem auto" }}></div>
                                <Text size="xl" style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.8, fontSize: "1.125rem" }}>
                                    Three unforgettable days of celebration in Vilanova i la Geltrú
                                </Text>
                            </Box>

                            {/* DAY 1 */}
                            <Card className="elegant-card" radius="md" p="xl" style={{ backgroundColor: "rgba(250, 248, 245, 0.6)" }}>
                                <Stack gap="lg">
                                    <Group align="center" gap="md">
                                        <ThemeIcon
                                            size={50}
                                            radius="xl"
                                            style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}
                                        >
                                            <IconCalendar size={25} aria-hidden="true" />
                                        </ThemeIcon>
                                        <Title order={2} style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), serif", fontWeight: 400, fontSize: "1.75rem" }}>
                                            Day 1 - Welcome & Rehearsal
                                        </Title>
                                    </Group>

                                    <Stack gap="md" style={{ marginLeft: "4rem" }}>
                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconClock size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    14:00 onwards
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Check in for all staying guests
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconPool size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Pool Bar & BBQ
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Welcome lunch with music by the pool
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconToolsKitchen2 size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Evening - Rehearsal Dinner
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Tapas dinner with Spanish wines and beverages
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconMusic size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Entertainment
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Live music and open premium bar
                                                </Text>
                                            </Stack>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>

                            {/* DAY 2 */}
                            <Card className="elegant-card" radius="md" p="xl">
                                <Stack gap="lg">
                                    <Group align="center" gap="md">
                                        <ThemeIcon
                                            size={50}
                                            radius="xl"
                                            style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}
                                        >
                                            <IconHeart size={25} aria-hidden="true" />
                                        </ThemeIcon>
                                        <Title order={2} style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), serif", fontWeight: 400, fontSize: "1.75rem" }}>
                                            Day 2 - Wedding Day
                                        </Title>
                                    </Group>

                                    <Stack gap="md" style={{ marginLeft: "4rem" }}>
                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "rgba(250, 248, 245, 0.8)", color: "var(--gold)" }}
                                            >
                                                <IconChefHat size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Morning
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>Breakfast</Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "rgba(250, 248, 245, 0.8)", color: "var(--gold)" }}
                                            >
                                                <IconGlass size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Pre-Ceremony
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Cocktails and Cava with appetizers and snacks
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "rgba(250, 248, 245, 0.8)", color: "var(--gold)" }}
                                            >
                                                <IconToolsKitchen2 size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Reception Dinner
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    5-course dinner with Gran Villa Rosa Gran Reservas wine selection
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "rgba(250, 248, 245, 0.8)", color: "var(--gold)" }}
                                            >
                                                <IconMicrophone2 size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Laguna Stage & Bar
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Live band with premium cocktails and drinks
                                                </Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "rgba(250, 248, 245, 0.8)", color: "var(--gold)" }}
                                            >
                                                <IconMusic size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Private Night Club
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    DJ, dancing, night snacks from BBQ until 03:00+
                                                </Text>
                                            </Stack>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>

                            {/* DAY 3 */}
                            <Card className="elegant-card" radius="md" p="xl" style={{ backgroundColor: "rgba(250, 248, 245, 0.6)" }}>
                                <Stack gap="lg">
                                    <Group align="center" gap="md">
                                        <ThemeIcon
                                            size={50}
                                            radius="xl"
                                            style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}
                                        >
                                            <IconSun size={25} aria-hidden="true" />
                                        </ThemeIcon>
                                        <Title order={2} style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), serif", fontWeight: 400, fontSize: "1.75rem" }}>
                                            Day 3 - Farewell Celebration
                                        </Title>
                                    </Group>

                                    <Stack gap="md" style={{ marginLeft: "4rem" }}>
                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconChefHat size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Morning
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>Breakfast</Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconGlass size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    10:00 onwards
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>Open premium bar</Text>
                                            </Stack>
                                        </Group>

                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={35}
                                                radius="xl"
                                                style={{ backgroundColor: "#ffffff", color: "var(--gold)" }}
                                            >
                                                <IconPool size={18} aria-hidden="true" />
                                            </ThemeIcon>
                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                <Text fw={500} style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                                                    Poolside Celebration
                                                </Text>
                                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                                    Gran BBQ and salad buffet (including vegetarian and vegan options)
                                                    with DJ poolside
                                                </Text>
                                            </Stack>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>

                            <Box
                                className="elegant-card"
                                style={{
                                    textAlign: "center",
                                    marginTop: "3rem",
                                    padding: "2.5rem",
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.05rem" }}>
                                    We can&apos;t wait to celebrate with you in Vilanova for three unforgettable days!
                                </Text>
                            </Box>
                        </Stack>
                    </Container>
                </Box>
            </main>
        </>
    );
}

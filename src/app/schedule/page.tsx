import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Card,
  ThemeIcon,
  Group
} from '@mantine/core';
import { Navigation } from '@/components/Navigation';
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
  IconToolsKitchen2
} from '@tabler/icons-react';

export default function SchedulePage() {
  return (
    <>
      <Navigation />
      <Box style={{ paddingTop: 56 }}>
        <Container size="md" py="xl">
          <Stack gap="xl">
            <Box style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <Title 
                order={1} 
                size="3rem" 
                style={{ 
                  color: '#495057', 
                  marginBottom: '1rem',
                  fontFamily: 'serif' 
                }}
              >
                Wedding Schedule
              </Title>
            </Box>

            {/* DAY 1 */}
            <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="lg">
                <Group align="center" gap="md">
                  <ThemeIcon size={50} radius="xl" style={{ backgroundColor: '#8b7355', color: '#ffffff' }}>
                    <IconCalendar size={25} />
                  </ThemeIcon>
                  <Title order={2} style={{ color: '#495057', fontFamily: 'serif' }}>
                    Day 1 - Welcome & Rehearsal
                  </Title>
                </Group>
                
                <Stack gap="md" style={{ marginLeft: '4rem' }}>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconClock size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>14:00 onwards</Text>
                      <Text style={{ color: '#6c757d' }}>Check in for all staying guests</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconPool size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Pool Bar & BBQ</Text>
                      <Text style={{ color: '#6c757d' }}>Welcome lunch with music by the pool</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconToolsKitchen2 size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Evening - Rehearsal Dinner</Text>
                      <Text style={{ color: '#6c757d' }}>Tapas dinner with Spanish wines and beverages</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconMusic size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Entertainment</Text>
                      <Text style={{ color: '#6c757d' }}>Live music and open premium bar</Text>
                    </Stack>
                  </Group>
                </Stack>
              </Stack>
            </Card>

            {/* DAY 2 */}
            <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#ffffff' }}>
              <Stack gap="lg">
                <Group align="center" gap="md">
                  <ThemeIcon size={50} radius="xl" style={{ backgroundColor: '#8b7355', color: '#ffffff' }}>
                    <IconHeart size={25} />
                  </ThemeIcon>
                  <Title order={2} style={{ color: '#495057', fontFamily: 'serif' }}>
                    Day 2 - Wedding Day
                  </Title>
                </Group>
                
                <Stack gap="md" style={{ marginLeft: '4rem' }}>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#f8f9fa', color: '#8b7355' }}>
                      <IconChefHat size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Morning</Text>
                      <Text style={{ color: '#6c757d' }}>Breakfast</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#f8f9fa', color: '#8b7355' }}>
                      <IconGlass size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Pre-Ceremony</Text>
                      <Text style={{ color: '#6c757d' }}>Cocktails and Cava with appetizers and snacks</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#f8f9fa', color: '#8b7355' }}>
                      <IconToolsKitchen2 size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Reception Dinner</Text>
                      <Text style={{ color: '#6c757d' }}>5-course dinner with Gran Villa Rosa Gran Reservas wine selection</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#f8f9fa', color: '#8b7355' }}>
                      <IconMicrophone2 size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Laguna Stage & Bar</Text>
                      <Text style={{ color: '#6c757d' }}>Live band with premium cocktails and drinks</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#f8f9fa', color: '#8b7355' }}>
                      <IconMusic size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Private Night Club</Text>
                      <Text style={{ color: '#6c757d' }}>DJ, dancing, night snacks from BBQ until 03:00+</Text>
                    </Stack>
                  </Group>
                </Stack>
              </Stack>
            </Card>

            {/* DAY 3 */}
            <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="lg">
                <Group align="center" gap="md">
                  <ThemeIcon size={50} radius="xl" style={{ backgroundColor: '#8b7355', color: '#ffffff' }}>
                    <IconSun size={25} />
                  </ThemeIcon>
                  <Title order={2} style={{ color: '#495057', fontFamily: 'serif' }}>
                    Day 3 - Farewell Celebration
                  </Title>
                </Group>
                
                <Stack gap="md" style={{ marginLeft: '4rem' }}>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconChefHat size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Morning</Text>
                      <Text style={{ color: '#6c757d' }}>Breakfast</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconGlass size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>10:00 onwards</Text>
                      <Text style={{ color: '#6c757d' }}>Open premium bar</Text>
                    </Stack>
                  </Group>

                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={35} radius="xl" style={{ backgroundColor: '#ffffff', color: '#8b7355' }}>
                      <IconPool size={18} />
                    </ThemeIcon>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={500} style={{ color: '#495057' }}>Poolside Celebration</Text>
                      <Text style={{ color: '#6c757d' }}>Gran BBQ and salad buffet (including vegetarian and vegan options) with DJ poolside</Text>
                    </Stack>
                  </Group>
                </Stack>
              </Stack>
            </Card>

            <Box 
              style={{ 
                textAlign: 'center', 
                marginTop: '3rem', 
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                borderRadius: 8 
              }}
            >
              <Text style={{ color: '#6c757d' }}>
                We can&apos;t wait to celebrate with you in Vilanova for three unforgettable days!
              </Text>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

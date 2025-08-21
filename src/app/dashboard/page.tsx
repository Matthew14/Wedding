import {
  Title,
  Text,
  Group,
  Stack,
  Paper,
  SimpleGrid,
  Box
} from '@mantine/core';

export default function DashboardPage() {
  // Sample overview data - you can replace this with real data later
  const stats = {
    totalInvited: 150,
    totalResponded: 6,
    totalAttending: 4,
    totalNotAttending: 1,
    totalMaybe: 1,
    totalPlusOnes: 3,
    responseRate: 4
  };

  return (
    <Stack gap="xl">
      <Box>
        <Title
          order={1}
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
            fontWeight: 300,
            color: '#495057',
            marginBottom: '0.5rem',
            fontFamily: 'serif',
          }}
        >
          Wedding Dashboard
        </Title>
        <Text size="lg" style={{ color: '#6c757d' }}>
          Overview of your wedding planning progress
        </Text>
      </Box>

      {/* Overview Stats */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#8b7355">{stats.totalInvited}</Text>
          <Text size="sm" color="#6c757d">Total Invited</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#3b82f6">{stats.totalResponded}</Text>
          <Text size="sm" color="#6c757d">Responded</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#22c55e">{stats.totalAttending}</Text>
          <Text size="sm" color="#6c757d">Attending</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#ef4444">{stats.totalNotAttending}</Text>
          <Text size="sm" color="#6c757d">Not Attending</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#eab308">{stats.totalMaybe}</Text>
          <Text size="sm" color="#6c757d">Maybe</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#8b7355">{stats.totalPlusOnes}</Text>
          <Text size="sm" color="#6c757d">Plus Ones</Text>
        </Paper>
        
        <Paper shadow="sm" radius="md" p="lg" style={{ textAlign: 'center' }}>
          <Text size="xl" fw={700} color="#8b7355">{stats.responseRate}%</Text>
          <Text size="sm" color="#6c757d">Response Rate</Text>
        </Paper>
      </SimpleGrid>

      {/* Quick Actions or Summary */}
      <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: '#ffffff' }}>
        <Stack gap="md">
          <Title order={3} style={{ color: '#495057', fontFamily: 'serif' }}>
            Planning Summary
          </Title>
          <Group gap="xl">
            <Box>
              <Text size="sm" fw={500} color="#495057">RSVP Deadline</Text>
              <Text size="lg" color="#8b7355">March 1, 2026</Text>
            </Box>
            <Box>
              <Text size="sm" fw={500} color="#495057">Wedding Date</Text>
              <Text size="lg" color="#8b7355">May 2026</Text>
            </Box>
            <Box>
              <Text size="sm" fw={500} color="#495057">Expected Guests</Text>
              <Text size="lg" color="#8b7355">{stats.totalAttending + stats.totalPlusOnes} confirmed</Text>
            </Box>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

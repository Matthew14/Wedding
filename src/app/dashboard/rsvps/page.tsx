import {
  Title,
  Text,
  Group,
  Stack,
  Box,
  Paper,
  Badge,
  Avatar,
  Table
} from '@mantine/core';

// Dummy RSVP data
const rsvpData = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    attendance: 'yes',
    plusOne: true,
    plusOneName: 'Mike Johnson',
    dietaryRestrictions: 'Vegetarian',
    message: 'So excited to celebrate with you both!',
    submittedDate: '2024-01-15'
  },
  {
    id: 2,
    name: 'David Chen',
    email: 'david.chen@email.com',
    attendance: 'yes',
    plusOne: false,
    plusOneName: '',
    dietaryRestrictions: '',
    message: 'Can\'t wait for the big day!',
    submittedDate: '2024-01-12'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    attendance: 'no',
    plusOne: false,
    plusOneName: '',
    dietaryRestrictions: '',
    message: 'Sorry I can\'t make it, but sending all my love!',
    submittedDate: '2024-01-10'
  },
  {
    id: 4,
    name: 'Tom Wilson',
    email: 'tom.wilson@email.com',
    attendance: 'maybe',
    plusOne: true,
    plusOneName: 'Jennifer Wilson',
    dietaryRestrictions: 'Gluten-free',
    message: 'Trying to arrange childcare, will confirm soon!',
    submittedDate: '2024-01-08'
  },
  {
    id: 5,
    name: 'Lisa Park',
    email: 'lisa.park@email.com',
    attendance: 'yes',
    plusOne: false,
    plusOneName: '',
    dietaryRestrictions: 'No shellfish',
    message: 'Looking forward to your special day!',
    submittedDate: '2024-01-05'
  },
  {
    id: 6,
    name: 'Alex Thompson',
    email: 'alex.thompson@email.com',
    attendance: 'yes',
    plusOne: true,
    plusOneName: 'Sam Thompson',
    dietaryRestrictions: '',
    message: 'We\'re so happy for you two!',
    submittedDate: '2024-01-03'
  }
];

export default function RSVPPage() {
  const getAttendanceBadge = (attendance: string) => {
    switch (attendance) {
      case 'yes':
        return <Badge color="green" variant="light">Attending</Badge>;
      case 'no':
        return <Badge color="red" variant="light">Not Attending</Badge>;
      case 'maybe':
        return <Badge color="yellow" variant="light">Maybe</Badge>;
      default:
        return <Badge color="gray" variant="light">Unknown</Badge>;
    }
  };

  const totalAttending = rsvpData.filter(rsvp => rsvp.attendance === 'yes').length;
  const totalNotAttending = rsvpData.filter(rsvp => rsvp.attendance === 'no').length;
  const totalMaybe = rsvpData.filter(rsvp => rsvp.attendance === 'maybe').length;
  const totalPlusOnes = rsvpData.filter(rsvp => rsvp.attendance === 'yes' && rsvp.plusOne).length;

  return (
    <Stack gap="xl">
      <Box style={{ textAlign: 'center' }}>
        <Title
          order={2}
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
            fontWeight: 300,
            color: '#495057',
            marginBottom: '0.5rem',
            fontFamily: 'serif',
          }}
        >
          RSVP Responses
        </Title>
        <Text size="lg" style={{ color: '#6c757d' }}>
          Track who&apos;s attending your special day
        </Text>
      </Box>

      {/* Summary Cards */}
      <Group justify="center" gap="lg">
        <Paper shadow="sm" radius="md" p="md" style={{ textAlign: 'center', minWidth: 120 }}>
          <Text size="xl" fw={700} color="#22c55e">{totalAttending}</Text>
          <Text size="sm" color="#6c757d">Attending</Text>
        </Paper>
        <Paper shadow="sm" radius="md" p="md" style={{ textAlign: 'center', minWidth: 120 }}>
          <Text size="xl" fw={700} color="#ef4444">{totalNotAttending}</Text>
          <Text size="sm" color="#6c757d">Not Attending</Text>
        </Paper>
        <Paper shadow="sm" radius="md" p="md" style={{ textAlign: 'center', minWidth: 120 }}>
          <Text size="xl" fw={700} color="#eab308">{totalMaybe}</Text>
          <Text size="sm" color="#6c757d">Maybe</Text>
        </Paper>
        <Paper shadow="sm" radius="md" p="md" style={{ textAlign: 'center', minWidth: 120 }}>
          <Text size="xl" fw={700} color="#8b7355">{totalPlusOnes}</Text>
          <Text size="sm" color="#6c757d">Plus Ones</Text>
        </Paper>
      </Group>

      {/* RSVP Table */}
      <Paper shadow="md" radius="lg" p="xl" style={{ backgroundColor: '#ffffff', overflowX: 'auto' }}>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Status</th>
              <th>Plus One</th>
              <th>Dietary Restrictions</th>
              <th>Message</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rsvpData.map((rsvp) => (
              <tr key={rsvp.id}>
                <td>
                  <Group gap="sm">
                    <Avatar 
                      size="sm" 
                      radius="xl" 
                      color="#8b7355"
                    >
                      {rsvp.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={500}>{rsvp.name}</Text>
                      <Text size="xs" c="dimmed">{rsvp.email}</Text>
                    </Box>
                  </Group>
                </td>
                <td>
                  {getAttendanceBadge(rsvp.attendance)}
                </td>
                <td>
                  {rsvp.plusOne ? (
                    <Box>
                      <Badge color="blue" variant="light">Yes</Badge>
                      {rsvp.plusOneName && (
                        <Text size="xs" c="dimmed" mt={2}>{rsvp.plusOneName}</Text>
                      )}
                    </Box>
                  ) : (
                    <Badge color="gray" variant="light">No</Badge>
                  )}
                </td>
                <td>
                  <Text size="sm">
                    {rsvp.dietaryRestrictions || <Text c="dimmed">None</Text>}
                  </Text>
                </td>
                <td>
                  <Text size="sm" style={{ maxWidth: 200 }}>
                    {rsvp.message || <Text c="dimmed">No message</Text>}
                  </Text>
                </td>
                <td>
                  <Text size="sm" c="dimmed">
                    {new Date(rsvp.submittedDate).toLocaleDateString()}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

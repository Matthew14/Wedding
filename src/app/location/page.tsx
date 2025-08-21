import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Card,
  Group,
} from '@mantine/core';
import { Navigation } from '@/components/Navigation';
import { IconMapPin, IconPlane, IconCar } from '@tabler/icons-react';

export default function LocationPage() {
  return (
    <>
      <Navigation />
      <Box style={{ paddingTop: 56 }}>
        <Container size="md" py="xl">
          <Stack gap="xl">
            <Box style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Title 
                order={1} 
                size="3rem" 
                style={{ 
                  color: '#495057', 
                  marginBottom: '1rem',
                  fontFamily: 'serif' 
                }}
              >
                Wedding Location
              </Title>
              <Text size="lg" style={{ color: '#6c757d', maxWidth: 600, margin: '0 auto' }}>
                Join us in beautiful Vilanova i la Geltrú, Spain for our special celebration
              </Text>
            </Box>

            {/* Google Maps Embed */}
            <Box 
              style={{ 
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                marginBottom: '2rem',
              }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000.3689009476025!2d1.70777487686561!3d41.235521605400095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a387a9b003ec95%3A0xe02f2753aeaf6066!2sGran%20Villa%20Rosa!5e0!3m2!1sen!2sie!4v1755797562369!5m2!1sen!2sie"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Gran Villa Rosa Location"
              />
            </Box>

            {/* Venue Information */}
            <Card withBorder radius="md" p="xl" style={{ marginBottom: '2rem' }}>
              <Group align="flex-start" gap="lg">
                <IconMapPin size={32} color="#8b7355" />
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Title order={3} style={{ color: '#495057' }}>
                    Venue Details
                  </Title>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                    We&apos;ll be celebrating at the beautiful Gran Villa Rosa in Vilanova i la Geltrú. 
                    See the map above for the exact location and use the interactive features for directions.
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* Travel Information */}
            <Card withBorder radius="md" p="xl" style={{ marginBottom: '2rem' }}>
              <Group align="flex-start" gap="lg">
                <IconPlane size={32} color="#8b7355" />
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Title order={3} style={{ color: '#495057' }}>
                    Getting There
                  </Title>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                    <strong>Nearest Airport:</strong> Barcelona-El Prat Airport (BCN)
                  </Text>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                    The nearest airport is Barcelona-El Prat, which is well-connected with direct flights from major 
                    cities worldwide. 
                    From the airport, you can easily reach the city centre by metro, bus, or taxi.
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* Parking Information */}
            <Card withBorder radius="md" p="xl">
              <Group align="flex-start" gap="lg">
                <IconCar size={32} color="#8b7355" />
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Title order={3} style={{ color: '#495057' }}>
                    Parking & Accessibility
                  </Title>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                    <strong>Ample parking is available on-site</strong> at Gran Villa Rosa, making driving a convenient option for guests.
                  </Text>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6, marginTop: '0.5rem' }}>
                    <strong>For international guests:</strong> Consider renting a car for flexibility in exploring the beautiful 
                    Catalonian coast. The venue is easily accessible by car, and having your own transport allows you to enjoy 
                    nearby Sitges and other coastal towns at your own pace.
                  </Text>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6, marginTop: '0.5rem' }}>
                    <strong>Alternative options:</strong> Taxis and ride-sharing services are also available for those who prefer 
                    not to drive. We&apos;re committed to ensuring all our guests can comfortably attend our celebration.
                  </Text>
                </Stack>
              </Group>
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

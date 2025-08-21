import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Box
} from '@mantine/core';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import Image from 'next/image';


export default function HomePage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <Box style={{ paddingTop: 56 }}>
          {/* Hero Section */}
          <Box
          style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <Container size="xl" style={{ textAlign: 'center', zIndex: 1 }}>
            <Stack gap="xl" align="center">
              {/* Hero Image */}
              <Box
                style={{
                  width: 450,
                  height: 450,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid white',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  marginBottom: '1.5rem',
                  position: 'relative',
                }}
              >
                <Image
                  src="/rebecca-matthew-wedding-photo.jpeg"
                  alt="Rebecca and Matthew, the couple getting married, in their engagement photo"
                  fill
                  style={{
                    objectFit: 'cover',
                    objectPosition: '75% center',
                  }}
                  priority
                />
              </Box>

              <Title
                order={1}
                size="3.5rem"
                style={{
                  fontWeight: 300,
                  color: '#495057',
                  marginBottom: '0.5rem',
                  fontFamily: 'serif',
                }}
              >
                Rebecca & Matthew
              </Title>

              <Title
                order={2}
                size="1.5rem"
                style={{
                  fontWeight: 300,
                  color: '#8b7355',
                  marginBottom: '1.5rem',
                  fontFamily: 'serif',
                  letterSpacing: '0.1em',
                }}
              >
                May, 2026
              </Title>

              <Text
                size="xl"
                style={{
                  color: '#6c757d',
                  maxWidth: 600,
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                }}
              >
                Join us as we celebrate our love and begin our journey together as husband and wife.
                We can&apos;t wait to share this special day with you!
              </Text>

              <Group gap="lg" justify="center" style={{ marginTop: '0.75rem' }}>
                <Button
                  component={Link}
                  href="/location"
                  size="xl"
                  variant="filled"
                  className="primary-cta-button"
                  style={{
                    backgroundColor: '#8b7355',
                    borderColor: '#8b7355',
                    color: '#ffffff',
                    borderRadius: 30,
                    padding: '12px 30px',
                    fontSize: '18px',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(139, 115, 85, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  View Location
                </Button>
                <Button
                  component={Link}
                  href="/faqs"
                  size="xl"
                  variant="outline"
                  className="secondary-cta-button"
                  style={{
                    borderColor: '#8b7355',
                    backgroundColor: '#ffffff',
                    color: '#8b7355',
                    borderRadius: 30,
                    padding: '12px 30px',
                    fontSize: '18px',
                    fontWeight: 600,
                    borderWidth: '2px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Read FAQs
                </Button>
              </Group>
            </Stack>
          </Container>
        </Box>
      </Box>
      </main>
    </>
  );
}
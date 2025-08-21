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
          <Container size="xl" style={{ textAlign: 'center', zIndex: 1, padding: '0 1rem' }}>
            <Stack gap="xl" align="center">
              {/* Hero Image */}
              <Box
                style={{
                  width: 'min(450px, 80vw)',
                  height: 'min(450px, 80vw)',
                  maxWidth: '450px',
                  maxHeight: '450px',
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
                style={{
                  fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
                  fontWeight: 300,
                  color: '#495057',
                  marginBottom: '0.5rem',
                  fontFamily: 'serif',
                  lineHeight: 1.2,
                }}
              >
                Rebecca & Matthew
              </Title>

              <Title
                order={2}
                style={{
                  fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
                  fontWeight: 300,
                  color: '#8b7355',
                  marginBottom: '1.5rem',
                  fontFamily: 'serif',
                  letterSpacing: '0.1em',
                  lineHeight: 1.3,
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

              <Group gap="lg" justify="center" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
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
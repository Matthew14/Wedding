'use client';

import {
  Container,
  Title,
  Text,
  Paper,
  Button,
  Stack,
  Box,
  Alert
} from '@mantine/core';
import { IconCheck, IconHeart } from '@tabler/icons-react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

export default function RSVPSuccessPage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <Box style={{ paddingTop: 56 }}>
          <Container size="sm" py="xl">
            <Stack gap="xl" align="center">
        {/* Success Icon */}
        <Box style={{ textAlign: 'center' }}>
          <IconCheck 
            size={80} 
            color="#22c55e" 
            style={{ marginBottom: '1rem' }}
          />
        </Box>

        {/* Success Message */}
        <Box style={{ textAlign: 'center' }}>
          <Title
            order={1}
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 300,
              color: '#495057',
              marginBottom: '1rem',
              fontFamily: 'serif',
            }}
          >
            Thank You!
          </Title>
          <Text size="lg" style={{ color: '#6c757d', marginBottom: '1rem' }}>
            Your RSVP has been submitted successfully.
          </Text>
          <Text size="md" style={{ color: '#8b7355' }}>
            We&apos;re looking forward to celebrating with you!
          </Text>
        </Box>

        {/* Success Details */}
        <Paper shadow="md" radius="lg" p="xl" style={{ width: '100%', maxWidth: '500px' }}>
          <Stack gap="md">
            <Alert icon={<IconHeart size={16} />} title="What happens next?" color="green" variant="light">
              <Text size="sm">
                We&apos;ve received your RSVP and will be in touch with any additional details 
                as the wedding approaches.
              </Text>
            </Alert>
            
            <Text size="sm" style={{ color: '#6c757d', textAlign: 'center' }}>
              If you need to make any changes to your RSVP, please contact us directly.
            </Text>
          </Stack>
        </Paper>

        {/* Navigation */}
        <Stack gap="md" align="center">
          <Button
            component={Link}
            href="/"
            variant="filled"
            color="#8b7355"
            size="lg"
          >
            Back to Wedding Homepage
          </Button>
          
          <Button
            component={Link}
            href="/rsvp"
            variant="outline"
            color="#8b7355"
            size="md"
          >
            Submit Another RSVP
          </Button>
            </Stack>
          </Stack>
          </Container>
        </Box>
      </main>
    </>
  );
}

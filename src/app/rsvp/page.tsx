'use client';

import {
  Title,
  Text,
  Stack,
  Paper,
  Button,
  Box,
  Container,
  TextInput
} from '@mantine/core';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconMail } from '@tabler/icons-react';
import { Navigation } from '@/components/Navigation';

export default function RSVPPage() {
  const [rsvpCode, setRsvpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rsvpCode.trim()) {
      setError('Please enter your RSVP code');
      return;
    }

    if (rsvpCode.trim().length !== 6) {
      setError('RSVP code must be exactly 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if the RSVP code exists
      const response = await fetch(`/api/rsvp/validate/${rsvpCode.trim()}`);
      
      if (response.ok) {
        // Redirect to the RSVP form page
        router.push(`/rsvp/${rsvpCode.trim()}`);
      } else {
        setError('Invalid RSVP code. Please check and try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main id="main-content">
        <Box style={{ paddingTop: 56 }}>
          <Container size="sm" py="xl">
            <Stack gap="xl" align="center">
        {/* Header */}
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
            RSVP
          </Title>
          <Text size="lg" style={{ color: '#6c757d' }}>
            Please enter your unique RSVP code to respond to our invitation. 
            Your code can be found in your invitation. Alternatively, click the link in your invitation
            or scan the QR code to take you to your personalised link. 
          </Text>
        </Box>

        {/* RSVP Code Form */}
        <Paper shadow="md" radius="lg" p="xl" style={{ width: '100%', maxWidth: '400px' }}>
          <form onSubmit={handleSubmit}>
            <Stack gap="lg">
              <TextInput
                label="RSVP Code"
                placeholder="Enter your 6-character code"
                value={rsvpCode}
                onChange={(e) => setRsvpCode(e.target.value)}
                maxLength={6}
                size="lg"
                leftSection={<IconMail size={20} />}
                error={error}
                required
                style={{ textTransform: 'uppercase' }}
              />
              
              <Button
                type="submit"
                size="lg"
                loading={loading}
                color="#8b7355"
                fullWidth
              >
                Continue to RSVP Form
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Help Text */}
        <Paper shadow="sm" radius="md" p="md" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" style={{ color: '#6c757d', textAlign: 'center' }}>
            Your RSVP code can be found on your wedding invitation. 
            If you need help, please contact us.
          </Text>
        </Paper>
            </Stack>
          </Container>
        </Box>
      </main>
    </>
  );
}

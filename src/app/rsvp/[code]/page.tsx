'use client';

import {
  Container,
  Title,
  Text,
  Paper,
  Checkbox,
  Textarea,
  Button,
  Stack,
  Alert,
  Box,
  Divider,
  Radio,
  Group
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  IconCheck, 
  IconX, 
  IconUsers, 
   
  IconBed, 
  IconChefHat, 
  IconMusic, 
  IconPlane, 
  IconMessage,
  IconBook
} from '@tabler/icons-react';
import { Navigation } from '@/components/Navigation';

interface RSVPFormData {
  coming: boolean;
  invitees: { id: number; name: string; coming: boolean }[];
  own_accomodation: string;
  dietary_restrictions: string;
  song_request: string;
  travel_plans: string;
  message: string;
}

interface Invitee {
  id: number;
  first_name: string;
  last_name: string;
}

export default function RSVPFormPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<RSVPFormData>({
    coming: true,
    invitees: [],
    own_accomodation: 'yes',
    dietary_restrictions: '',
    song_request: '',
    travel_plans: '',
    message: ''
  });

  useEffect(() => {
    const fetchRSVPData = async () => {
      try {
        const code = params.code as string;
        
        // Fetch RSVP data and invitees
        const response = await fetch(`/api/rsvp/${code}`);
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            invitees: data.invitees?.map((inv: Invitee) => ({ 
              id: inv.id, 
              name: `${inv.first_name} ${inv.last_name}`, 
              coming: true 
            })) || []
          }));
        } else {
          setError('Failed to load RSVP data');
        }
      } catch {
        setError('Something went wrong while loading the form');
      } finally {
        setLoading(false);
      }
    };

    if (params.code) {
      fetchRSVPData();
    }
  }, [params.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const code = params.code as string;
      const response = await fetch(`/api/rsvp/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/rsvp/success');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit RSVP');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteeChange = (inviteeId: number, coming: boolean) => {
    setFormData(prev => ({
      ...prev,
      invitees: prev.invitees.map(inv => 
        inv.id === inviteeId ? { ...inv, coming } : inv
      )
    }));
  };

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="xl" align="center">
          <Text>Loading RSVP form...</Text>
        </Stack>
      </Container>
    );
  }

  if (error && !success) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="xl" align="center">
          <Alert icon={<IconX size={16} />} title="Error" color="red">
            {error}
          </Alert>
          <Button onClick={() => router.push('/rsvp')} variant="outline">
            Back to RSVP Code Entry
          </Button>
        </Stack>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="xl" align="center">
          <Alert icon={<IconCheck size={16} />} title="Success" color="green">
            Thank you for your RSVP! You will be redirected shortly.
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <>
      <Navigation />
      <main id="main-content">
        <Box style={{ paddingTop: 56 }}>
          <Container size="md" py="xl">
            <Stack gap="xl">
        {/* Header */}
        <Box style={{ textAlign: 'center' }}>
          <Title
            order={1}
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 300,
              color: '#8b7355',
              marginBottom: '1rem',
              fontFamily: 'cursive',
              fontStyle: 'italic',
            }}
          >
            Répondez s&apos;il vous plaît
          </Title>
          <Text size="lg" style={{ color: '#6c757d' }}>
            Let us know if you&apos;re coming to our wedding! Once you&apos;ve filled out this form, you will still
             be able to amend your details here up until 
            the 1st of December. After that please get in touch if something changes.
          </Text>
        </Box>

        {/* RSVP Form */}
        <Paper shadow="md" radius="lg" p="xl">
          <form onSubmit={handleSubmit}>
            <Stack gap="xl">              
              {/* Are you joining us? */}
              <Box mb="xl">
                <Group gap="sm" mb="md">
                  <IconBook size={20} color="#8b7355" />
                  <Text size="lg" fw={500}>
                    Are you joining us?
                  </Text>
                  <Text span style={{ color: '#e53e3e' }}>*</Text>
                </Group>
                <Radio.Group
                  value={formData.coming ? 'yes' : 'no'}
                  onChange={(value) => setFormData(prev => ({ ...prev, coming: value === 'yes' }))}
                  required
                >
                  <Group gap="lg">
                    <Radio value="yes" label="Yes" size="md" />
                    <Radio value="no" label="No" size="md" />
                  </Group>
                </Radio.Group>
              </Box>

              {/* Form fields - Only visible when 'coming' is Yes */}
              {formData.coming && (
                <>
                  {/* Is everyone coming? - Only visible when there are multiple invitees */}
                  {formData.invitees.length > 1 && (
                    <Box mb="xl">
                      <Group gap="sm" mb="md">
                        <IconUsers size={20} color="#8b7355" />
                        <Text size="lg" fw={500}>
                          Is everyone coming?
                        </Text><Text span style={{ color: '#e53e3e' }}>*</Text>
                      </Group>
                      <Stack gap="sm">
                        {formData.invitees.map((invitee) => (
                          <Checkbox
                            key={invitee.id}
                            label={invitee.name}
                            checked={invitee.coming}
                            onChange={(e) => {
                              if (e.currentTarget) {
                                handleInviteeChange(invitee.id, e.currentTarget?.checked);
                              }
                            }}
                            defaultChecked
                            size="md"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Will you be staying with us at Gran Villa Rosa? */}
                  <Box mb="xl">
                    <Group gap="sm" mb="md">
                      <IconBed size={20} color="#8b7355" />
                      <Text size="lg" fw={500}>Will you be staying with us at Gran Villa Rosa?</Text>
                      <Text span style={{ color: '#e53e3e' }}>*</Text>
                    </Group>
                    <Text size="sm" style={{ color: '#6c757d', marginBottom: '1rem'}}>
                      We&apos;ve reserved a complimentary room in the venue for you for both nights. 
                      If you&apos;d prefer to arrange your own accommodation, please let us know.
                    </Text>
                    <Radio.Group
                      value={formData.own_accomodation}
                      onChange={(value) => setFormData(prev => ({ ...prev, own_accomodation: value }))}
                      required
                    >
                      <Group gap="lg">
                        <Radio value="yes" label="Yes" size="md" />
                        <Radio value="no" label="No" size="md" />
                      </Group>
                    </Radio.Group>
                  </Box>

                  {/* Dietary restrictions */}
                  <Box mb="xl">
                    <Group gap="sm" mb="md">
                      <IconChefHat size={20} color="#8b7355" />
                      <Text size="lg" fw={500}>Do you have any allergies or specific dietary requests?</Text>
                    </Group>
                    <Textarea
                      placeholder="Please let us know about any dietary requirements..."
                      value={formData.dietary_restrictions}
                      onChange={(e) => setFormData(prev => ({ ...prev, dietary_restrictions: e.currentTarget.value }))}
                      minRows={3}
                      size="md"
                    />
                  </Box>

                  {/* Song request */}
                  <Box mb="xl">
                    <Group gap="sm" mb="md">
                      <IconMusic size={20} color="#8b7355" />
                      <Text size="lg" fw={500}>Got a song request for the wedding playlist? Add it here!</Text>
                    </Group>
                    <Textarea
                      placeholder="What song would you like to hear at our wedding?"
                      value={formData.song_request}
                      onChange={(e) => setFormData(prev => ({ ...prev, song_request: e.currentTarget.value }))}
                      minRows={2}
                      size="md"
                    />
                  </Box>

                  {/* Travel plans */}
                  <Box mb="xl">
                    <Group gap="sm" mb="md">
                      <IconPlane size={20} color="#8b7355" />
                      <Text size="lg" fw={500}>
                        Please add any travel plans so we can help with transfers
                      </Text>
                    </Group>
                    <Textarea
                      placeholder="Flight number, day of travel etc."
                      value={formData.travel_plans}
                      onChange={(e) => setFormData(prev => ({ ...prev, travel_plans: e.currentTarget.value }))}
                      minRows={3}
                      size="md"
                    />
                  </Box>
                </>
              )}

              {/* Additional message */}
              <Box mb="xl">
                <Group gap="sm" mb="md">
                  <IconMessage size={20} color="#8b7355" />
                  <Text size="lg" fw={500}>Anything else you&apos;d like us to know?</Text>
                </Group>
                <Textarea
                  placeholder="Any other information you'd like to share..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.currentTarget.value }))}
                  minRows={3}
                  size="md"
                />
              </Box>

              <Divider />

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                color="#8b7355"
                fullWidth
              >
                Submit RSVP
              </Button>
            </Stack>
          </form>
        </Paper>
            </Stack>
          </Container>
        </Box>
      </main>
    </>
  );
}

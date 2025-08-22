'use client';

import {
  Title,
  Text,
  Group,
  Stack,
  Paper,
  Box
} from '@mantine/core';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const weddingDate = new Date('2026-05-23T00:00:00');
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = weddingDate.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  return (
    <Stack gap="xl" align="center">
      {/* Main Countdown Title */}
      <Box style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
          Countdown to Our Wedding
        </Title>
        <Text size="xl" style={{ color: '#8b7355', fontWeight: 500 }}>
          May 23rd, 2026
        </Text>
      </Box>

      {/* Countdown Timer */}
      <Paper 
        shadow="xl" 
        radius="xl" 
        p="xl" 
        style={{ 
          backgroundColor: '#ffffff',
          border: '2px solid #f1f3f4',
          minWidth: '600px',
          maxWidth: '800px'
        }}
      >
        <Stack gap="xl" align="center">
          <Title order={2} style={{ color: '#495057', fontFamily: 'serif', marginBottom: '1rem' }}>
            Time Remaining
          </Title>
          
          <Group gap="lg" justify="center" wrap="wrap">
            {/* Days */}
            <Box style={{ textAlign: 'center', minWidth: '120px' }}>
              <Paper 
                shadow="md" 
                radius="lg" 
                p="xl" 
                style={{ 
                  backgroundColor: '#8b7355',
                  color: 'white',
                  minWidth: '100px'
                }}
              >
                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                  {formatNumber(timeLeft.days)}
                </Text>
                <Text size="sm" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Days
                </Text>
              </Paper>
            </Box>

            {/* Hours */}
            <Box style={{ textAlign: 'center', minWidth: '120px' }}>
              <Paper 
                shadow="md" 
                radius="lg" 
                p="xl" 
                style={{ 
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  minWidth: '100px'
                }}
              >
                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                  {formatNumber(timeLeft.hours)}
                </Text>
                <Text size="sm" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Hours
                </Text>
              </Paper>
            </Box>

            {/* Minutes */}
            <Box style={{ textAlign: 'center', minWidth: '120px' }}>
              <Paper 
                shadow="md" 
                radius="lg" 
                p="xl" 
                style={{ 
                  backgroundColor: '#22c55e',
                  color: 'white',
                  minWidth: '100px'
                }}
              >
                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                  {formatNumber(timeLeft.minutes)}
                </Text>
                <Text size="sm" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Minutes
                </Text>
              </Paper>
            </Box>

            {/* Seconds */}
            <Box style={{ textAlign: 'center', minWidth: '120px' }}>
              <Paper 
                shadow="md" 
                radius="lg" 
                p="xl" 
                style={{ 
                  backgroundColor: '#ef4444',
                  color: 'white',
                  minWidth: '100px'
                }}
              >
                <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                  {formatNumber(timeLeft.seconds)}
                </Text>
                <Text size="sm" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Seconds
                </Text>
              </Paper>
            </Box>
          </Group>
        </Stack>
      </Paper>

      {/* Wedding Details */}
      <Paper 
        shadow="md" 
        radius="lg" 
        p="xl" 
        style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e9ecef',
          maxWidth: '600px'
        }}
      >
        <Stack gap="md" align="center">
          <Title order={3} style={{ color: '#495057', fontFamily: 'serif' }}>
            Wedding Details
          </Title>
          <Group gap="xl" justify="center" wrap="wrap">
            <Box style={{ textAlign: 'center' }}>
              <Text size="sm" fw={500} color="#495057">Date</Text>
              <Text size="lg" color="#8b7355" fw={600}>May 23rd, 2026</Text>
            </Box>
            <Box style={{ textAlign: 'center' }}>
              <Text size="sm" fw={500} color="#495057">Day of Week</Text>
              <Text size="lg" color="#8b7355" fw={600}>Friday</Text>
            </Box>
            <Box style={{ textAlign: 'center' }}>
              <Text size="sm" fw={500} color="#495057">Season</Text>
              <Text size="lg" color="#8b7355" fw={600}>Spring</Text>
            </Box>
          </Group>
        </Stack>
      </Paper>

      {/* Inspirational Message */}
      <Paper 
        shadow="sm" 
        radius="lg" 
        p="lg" 
        style={{ 
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          maxWidth: '500px',
          textAlign: 'center'
        }}
      >
        <Text size="lg" style={{ color: '#6c757d', fontStyle: 'italic' }}>
          &quot;Every love story is beautiful, but ours is my favorite.&quot;
        </Text>
      </Paper>
    </Stack>
  );
}

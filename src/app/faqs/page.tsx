'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Accordion
} from '@mantine/core';
import { Navigation } from '@/components/Navigation';

const faqData = [
  {
    value: 'location',
    question: 'Where is the wedding?',
    answer: 'The wedding will be held at the Gran Villa Rosa in Vilanova i la Geltrú, Spain. The address is: Gran Villa Rosa, C. de la Fontanella, 08730 Vilanova i la Geltrú, Barcelona, Spain.'
  },
];

export default function FAQsPage() {
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
                Frequently Asked Questions
              </Title>
              <Text size="lg" style={{ color: '#6c757d', maxWidth: 600, margin: '0 auto' }}>
                Find answers to common questions about our wedding day
              </Text>
            </Box>

            <Accordion 
              variant="separated" 
              radius="md"
              defaultValue="dress-code"
              styles={{
                item: {
                  border: '1px solid #e9ecef',
                  marginBottom: '1rem',
                },
                control: {
                  padding: '1.5rem',
                  '&:hover': {
                    backgroundColor: '#f8f9fa',
                  },
                },
                label: {
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: '#495057',
                },
                content: {
                  padding: '1.5rem',
                  paddingTop: 0,
                },
              }}
            >
              {faqData.map((faq) => (
                <Accordion.Item key={faq.value} value={faq.value}>
                  <Accordion.Control>{faq.question}</Accordion.Control>
                  <Accordion.Panel>
                    <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                      {faq.answer}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>

            <Box 
              style={{ 
                textAlign: 'center', 
                marginTop: '3rem', 
                padding: '2rem',
                backgroundColor: '#ffffff',
                borderRadius: 8 
              }}
            >
              <Title order={3} style={{ color: '#495057', marginBottom: '1rem' }}>
                Still have questions?
              </Title>
              <Text style={{ color: '#6c757d' }}>
                Don&apos;t hesitate to reach out to us directly. We&apos;re here to help make sure you have everything 
                you need for our special day!
              </Text>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

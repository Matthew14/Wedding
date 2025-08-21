'use client';

import {
  Container,
  Tabs,
  Box
} from '@mantine/core';
import { Navigation } from '@/components/Navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    // Set active tab based on current path
    if (pathname.includes('/dashboard/rsvps')) {
      setActiveTab('rsvps');
    } else {
      setActiveTab('overview');
    }
  }, [pathname]);

  const handleTabChange = (value: string | null) => {
    if (value === 'rsvps') {
      router.push('/dashboard/rsvps');
    } else if (value === 'overview') {
      router.push('/dashboard');
    }
    setActiveTab(value);
  };

  return (
    <>
      <Navigation />
      <main id="main-content">
        <Box style={{ paddingTop: 56 }}>
          <Container size="xl" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tabs.List>
                <Tabs.Tab value="overview">
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="rsvps">
                  RSVPs
                </Tabs.Tab>
              </Tabs.List>

              <Box mt="lg">
                {children}
              </Box>
            </Tabs>
          </Container>
        </Box>
      </main>
    </>
  );
}

'use client';

import {
  Container,
  Group,
  Burger,
  Paper,
  Transition,
  Anchor,
  Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import classes from './Navigation.module.css';

const links = [
  { link: '/', label: 'Home' },
  { link: '/location', label: 'Location' },
  { link: '/schedule', label: 'Schedule' },
  { link: '/faqs', label: 'FAQs' },
  { link: '/rsvp', label: 'RSVP' },
];

export function Navigation() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const items = links.map((link) => (
    <Anchor
      component={Link}
      key={link.label}
      href={link.link}
      className={classes.link}
      data-active={pathname === link.link || undefined}
      onClick={() => {
        
        close();
      }}
    >
      {link.label}
    </Anchor>
  ));

  return (
    <header className={classes.header} role="banner">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Container size="lg" className={classes.inner}>
        <Anchor
          component={Link}
          href="/"
          size="lg"
          fw={600}
          style={{ 
            color: '#8b7355',
            textDecoration: 'none'
          }}
          onClick={() => {}}
        >
          Rebecca & Matthew
        </Anchor>
        <nav role="navigation" aria-label="Main navigation">
          <Group gap={5} visibleFrom="xs">
            {items}
            {user && (
              <Button
                component={Link}
                href="/dashboard"
                variant="filled"
                color="#8b7355"
                size="sm"
                style={{ 
                  backgroundColor: '#8b7355',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
                onClick={() => close()}
              >
                Dashboard
              </Button>
            )}
          </Group>
        </nav>

        <Burger 
          opened={opened} 
          onClick={toggle} 
          hiddenFrom="xs" 
          size="sm"
          aria-label={opened ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={opened}
          aria-controls="mobile-navigation"
        />

        <Transition transition="pop-top-right" duration={200} mounted={opened}>
          {(styles) => (
            <Paper 
              className={classes.dropdown} 
              withBorder 
              style={styles}
              id="mobile-navigation"
              role="navigation"
              aria-label="Mobile navigation menu"
            >
              {items}
              {user && (
                <Button
                  component={Link}
                  href="/dashboard"
                  variant="filled"
                  color="#8b7355"
                  size="sm"
                  fullWidth
                  style={{ 
                    backgroundColor: '#8b7355',
                    color: '#ffffff',
                    textDecoration: 'none',
                    marginTop: '0.5rem'
                  }}
                  onClick={() => close()}
                >
                  Dashboard
                </Button>
              )}
            </Paper>
          )}
        </Transition>
      </Container>
    </header>
  );
}

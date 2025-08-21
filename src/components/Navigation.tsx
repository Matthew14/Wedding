'use client';

import {
  Container,
  Group,
  Burger,
  Paper,
  Transition,
  Anchor
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import classes from './Navigation.module.css';

const links = [
  { link: '/', label: 'Home' },
  { link: '/location', label: 'Location' },
  { link: '/schedule', label: 'Schedule' },
  { link: '/faqs', label: 'FAQs' },
];

export function Navigation() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

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
    <header className={classes.header}>
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
        <Group gap={5} visibleFrom="xs">
          {items}
        </Group>

        <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />

        <Transition transition="pop-top-right" duration={200} mounted={opened}>
          {(styles) => (
            <Paper className={classes.dropdown} withBorder style={styles}>
              {items}
            </Paper>
          )}
        </Transition>
      </Container>
    </header>
  );
}

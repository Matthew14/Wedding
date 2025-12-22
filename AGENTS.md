---
name: Wedding Website Development Agent
description: AI assistant for building and maintaining Rebecca & Matthew's wedding website with Next.js, TypeScript, Mantine UI, and Supabase
---

# Wedding Website Development Agent

You are a full-stack TypeScript developer specializing in modern React applications. Your role is to help build and maintain a wedding website with a focus on clean code, accessibility, and thorough testing.

## Project Overview

**Purpose**: Wedding RSVP website for Rebecca & Matthew
**Target Users**: Wedding guests accessing via mobile and desktop
**Key Feature**: RSVP system with unique invitation codes, guest management, and admin dashboard

## Tech Stack

### Core Framework
- **Next.js**: 15.5.9 (App Router, Server Components)
- **React**: 19.0.0
- **TypeScript**: 5.7.2
- **Node.js**: 22.12.0

### UI & Styling
- **Mantine UI**: 7.15.2 (components) / 8.2.7 (forms)
- **Mantine Hooks**: 7.15.2
- **Tailwind CSS**: 3.4.17
- **Tabler Icons**: 3.26.0
- **Color Scheme**: Brown/gold (`#8b7355`)

### Backend & Data
- **Supabase**: PostgreSQL database with authentication
- **@supabase/ssr**: 0.6.1
- **@supabase/supabase-js**: 2.49.1

### Testing
- **Vitest**: 3.2.4 (unit tests)
- **Cypress**: 15.7.1 (E2E tests)
- **Testing Library**: React 16.3.0

### Code Quality
- **ESLint**: 9.17.0 with Next.js config
- **Commitlint**: 19.8.1 (conventional commits)
- **Husky**: 9.1.7 (pre-commit hooks)

## Project Structure

```
Wedding/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── faqs/         # FAQ management
│   │   │   └── rsvp/         # RSVP endpoints
│   │   ├── dashboard/        # Admin dashboard (protected)
│   │   ├── rsvp/             # RSVP flow pages
│   │   │   ├── [code]/      # Dynamic RSVP form
│   │   │   └── success/     # Confirmation page
│   │   ├── layout.tsx        # Root layout with Mantine provider
│   │   ├── page.tsx          # Homepage
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   ├── hooks/                # Custom hooks (useRSVPForm)
│   ├── types/                # TypeScript definitions
│   ├── utils/                # Utility functions
│   │   └── supabase/        # Supabase clients
│   └── test/                 # Test utilities
├── cypress/                  # E2E tests
│   ├── e2e/                 # Test specs
│   ├── fixtures/            # Test data
│   └── support/             # Custom commands
├── supabase/                 # Dev Supabase config
├── supabase-test/           # Test Supabase config (isolated)
├── docs/                    # Documentation
└── public/                  # Static assets
```

## Commands You Can Run

### Development
```bash
npm run dev                  # Start dev server (starts Supabase automatically)
npm run dev:next-only       # Start Next.js only (Supabase already running)
npm run build               # Production build
npm run lint                # Run ESLint
```

### Testing
```bash
npm test                    # Run unit tests in watch mode
npm run test:run           # Run unit tests once
npm run test:coverage      # Generate coverage report
npm run cypress:open       # Open Cypress UI
npm run test:e2e          # Run E2E tests (automated)
```

### Database
```bash
npm run supabase:start     # Start local Supabase (dev instance)
npm run supabase:reset     # Reset dev database
npm run supabase:test:start    # Start test Supabase (port 54421)
npm run supabase:test:reset    # Reset test database
```

## Code Style Guide

### Component Structure (Client Components)

✅ **Good Example:**
```tsx
"use client";

import { Container, Title, Text, Button } from "@mantine/core";
import { useState } from "react";
import { Navigation } from "@/components/Navigation";

export default function RSVPPage() {
    const [code, setCode] = useState("");

    return (
        <>
            <Navigation />
            <main id="main-content">
                <Container size="md" py="xl">
                    <Title order={1} style={{ color: "#8b7355" }}>
                        RSVP
                    </Title>
                    <Text>Enter your invitation code</Text>
                </Container>
            </main>
        </>
    );
}
```

❌ **Bad Example:**
```tsx
// Missing "use client" directive
// Inline styles without theme colors
// No semantic HTML structure
export default function RSVPPage() {
    return (
        <div style={{ padding: "20px", color: "brown" }}>
            <h1>RSVP</h1>
        </div>
    );
}
```

### Form Validation with Mantine

✅ **Good Example:**
```tsx
import { useForm } from "@mantine/form";

export const useRSVPForm = () => {
    const form = useForm<RSVPFormData>({
        initialValues: {
            accepted: true,
            invitees: [],
            staying_villa: "yes",
        },
        validate: {
            accepted: (value) => (value === undefined ? "Please select whether you're coming" : null),
            invitees: (value, values) => {
                if (values.accepted === true) {
                    const anyoneComing = value?.some(inv => inv.coming);
                    if (!anyoneComing) {
                        return "Please select at least one guest who will be attending";
                    }
                }
                return null;
            },
        },
    });
    return form;
};
```

❌ **Bad Example:**
```tsx
// Using form.isValid() to disable button prevents error messages from showing
<Button disabled={!form.isValid() || submitting}>Submit</Button>

// Should be:
<Button disabled={submitting}>Submit</Button>
```

### API Routes

✅ **Good Example:**
```tsx
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const supabase = await createClient();
    const { code } = await params;

    const { data, error } = await supabase
        .from("RSVPs")
        .select("*")
        .eq("short_url", code)
        .single();

    if (error) {
        return NextResponse.json(
            { error: "RSVP not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}
```

❌ **Bad Example:**
```tsx
// Missing error handling
// Not using await for async params in Next.js 15
// No type safety
export async function GET(request, { params }) {
    const data = await supabase
        .from("RSVPs")
        .select("*")
        .eq("short_url", params.code);
    return NextResponse.json(data);
}
```

### Testing Patterns

✅ **Good Example (E2E):**
```tsx
it('should prevent accepting invitation without selecting any invitees', () => {
    cy.visit('/rsvp/TEST01');
    cy.contains('John Doe', { timeout: 5000 }).should('be.visible');

    // Accept invitation
    cy.contains('Are you joining us?')
        .parent()
        .parent()
        .find('input[type="radio"][value="yes"]')
        .click({ force: true });

    // Uncheck all invitees
    cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').uncheck();
    cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').uncheck();

    // Try to submit - should fail validation
    cy.get('button[type="submit"]').contains('Submit RSVP').click();
    cy.wait(1000);

    // Validation should prevent submission
    cy.get('body').should('not.contain', 'Confirm & Submit');
    cy.url().should('include', '/rsvp/TEST01');
});
```

✅ **Good Example (Unit):**
```tsx
import { render, screen } from '@/test/test-utils';
import { Navigation } from '../Navigation';

it('renders navigation links', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RSVP' })).toBeInTheDocument();
});
```

## Boundaries

### ✅ Always Do

- **Use "use client"** directive for client components with hooks/state
- **Use semantic HTML** (`<main>`, `<nav>`, `<section>`)
- **Include alt text** for images
- **Use Mantine components** for UI (don't create custom equivalents)
- **Use theme color** `#8b7355` for primary elements
- **Write tests** for new features (both unit and E2E)
- **Follow conventional commits** (`feat:`, `fix:`, `test:`, `docs:`)
- **Use TypeScript** - no `any` types
- **Validate forms** with Mantine's `useForm` hook
- **Handle errors gracefully** with user-friendly messages
- **Use path aliases** (`@/` for `src/`)
- **Clear validation errors** when they become stale

### ⚠️ Ask First

- **Database schema changes** (migrations required)
- **Breaking API changes** (affects existing RSVPs)
- **New dependencies** (check bundle size impact)
- **Authentication flow changes** (security implications)
- **Major refactoring** (coordinate with ongoing work)
- **Changing color scheme** (affects brand consistency)
- **Modifying test data structure** (breaks existing tests)

### 🚫 Never Do

- **Commit directly to main** (always use feature branches)
- **Skip tests** for new features
- **Disable ESLint rules** without explanation
- **Use inline styles** instead of Tailwind/Mantine
- **Hardcode credentials** or API keys
- **Use `any` type** in TypeScript
- **Disable form validation** with `{ force: true }` on submit buttons
- **Mix dev and test Supabase instances** (port 54321 vs 54421)
- **Add AI attribution** to commit messages
- **Remove error handling** to "simplify" code
- **Use `form.isValid()` to disable submit buttons** (prevents error display)

## Database Context

### Two Supabase Instances

| Instance | Purpose | API Port | Config Directory |
|----------|---------|----------|------------------|
| **Dev** | Manual development | 54321 | `supabase/` |
| **Test** | E2E tests (isolated) | 54421 | `supabase-test/` |

### Key Tables

- **RSVPs**: Invitation codes and responses (`short_url`, `accepted`, `staying_villa`, etc.)
- **invitees**: Guest information linked to invitations (`first_name`, `last_name`, `coming`)
- **invitations**: Main invitation records with UUIDs
- **FAQs**: Frequently asked questions for the website

### Environment Variables

- **.env.local**: Development environment (port 54321)
- **.env.test**: Test environment (port 54421)
- Never commit these files (gitignored)

## Common Patterns

### Client-Side Data Fetching
```tsx
const [data, setData] = useState<RSVPData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
    const fetchData = async () => {
        try {
            const response = await fetch(`/api/rsvp/${code}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                setError("Failed to load data");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };
    fetchData();
}, [code]);
```

### Form Submission with Confirmation Modal
```tsx
const [showConfirmation, setShowConfirmation] = useState(false);

const handleSubmit = async (values: FormData) => {
    setSubmitting(true);
    const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });

    if (response.ok) {
        router.push('/success');
    }
    setSubmitting(false);
};

// Form submission triggers confirmation modal first
<form onSubmit={form.onSubmit(() => setShowConfirmation(true))}>
    <Button type="submit" disabled={submitting}>Submit</Button>
</form>

// Modal then calls actual submit handler
<Modal opened={showConfirmation}>
    <Button onClick={() => handleSubmit(form.values)}>Confirm & Submit</Button>
</Modal>
```

## External Review Bots

This project uses external AI agents for PR review:

- **Codex (OpenAI)**: Automated code analysis on pull requests
- **Cursor Bot**: AI-powered code review assistant

These bots provide feedback on code quality, potential bugs, and best practices. Their suggestions are advisory and require human review.

## Working with This Codebase

1. **Start Here**: Read `README.md` for setup instructions
2. **Understand the RSVP Flow**: Check `docs/RSVP_SYSTEM_README.md`
3. **Testing**: Review `docs/TESTING.md` and `cypress/README.md`
4. **Security**: See `docs/SECURITY.md` for implemented protections
5. **Make Changes**: Always create a feature branch (`feat/`, `fix/`, `test/`)
6. **Test Your Changes**: Run unit tests (`npm test`) and E2E tests (`npm run test:e2e`)
7. **Commit**: Follow conventional commits format
8. **Push**: GitHub Actions will run CI checks

## Questions to Ask Yourself

Before implementing a feature:

- ✅ Does this need to work on mobile?
- ✅ Is this accessible (keyboard navigation, screen readers)?
- ✅ What happens if the API call fails?
- ✅ Do I need unit tests, E2E tests, or both?
- ✅ Will this affect existing RSVPs in the database?
- ✅ Is this change documented in the relevant README?

---

**Last Updated**: December 2025

For human developers: See `.claude/CLAUDE.md` for additional AI assistant guidelines.

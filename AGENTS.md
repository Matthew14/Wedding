---
name: Wedding Website Development Agent
description: AI assistant for building and maintaining Rebecca & Matthew's wedding website with Next.js, TypeScript, Mantine UI, and AWS
---

# Wedding Website Development Agent

You are a full-stack TypeScript developer specialising in modern React applications. Your role is to help build and maintain a wedding website with a focus on clean code, accessibility, and thorough testing.

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
- **DynamoDB**: On-demand tables via the AWS SDK Document Client (no connection pooling needed)
- **AWS Cognito**: Admin authentication
- **AWS Amplify**: Hosting (WEB_COMPUTE — Lambda-based SSR)
- **CloudFront + S3**: Wedding photo CDN
- **CloudWatch**: Structured app logs at `/wedding/app`

### Testing
- **Vitest**: 3.2.4 (unit tests)
- **Testing Library**: React 16.3.0
- _E2E (Cypress) suite removed pending a rewrite — see [#164](https://github.com/Matthew14/Wedding/issues/164)_

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
│   │   │   ├── auth/         # Login/logout
│   │   │   ├── dashboard/    # Dashboard summary
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
│   │   ├── auth/            # Cognito sign-in helpers
│   │   ├── db/              # DynamoDB Document Client + typed repositories
│   │   └── logger.ts        # CloudWatch structured logger
│   └── test/                 # Test utilities
├── docs/                    # Documentation
└── public/                  # Static assets
```

## Commands You Can Run

### Development
```bash
npm run dev                  # Start dev server
npm run build               # Production build
npm run lint                # Run ESLint
```

### Testing
```bash
npm test                    # Run unit tests in watch mode
npm run test:run           # Run unit tests once
npm run test:coverage      # Generate coverage report
```

## How Env Vars Reach the Lambda

Amplify builds the Next.js app and deploys it as a Lambda. Environment variables are only available at Lambda runtime if they are **explicitly baked** into the bundle via the `env` section in `next.config.js`. Variables set in the Amplify console but NOT listed in `next.config.js` `env` are NOT available at runtime.

Current baked vars: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `DDB_ARCHIVE_TABLE`, `DDB_PHOTOS_TABLE`, `DDB_CATEGORIES_TABLE`, `LAMBDA_AWS_KEY_ID`, `LAMBDA_AWS_SECRET`.

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
import { listCategories } from "@/utils/db/categories";
import * as logger from "@/utils/logger";

export async function GET(request: NextRequest) {
    try {
        const categories = await listCategories();
        return NextResponse.json(categories);
    } catch (error) {
        await logger.error("GET /api/gallery/categories", "DB query failed", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

❌ **Bad Example:**
```tsx
// Missing error handling
// No logging
export async function GET() {
    const data = await listCategories();
    return NextResponse.json(data);
}
```

### Testing Patterns

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
- **Write unit tests** for new features
- **Follow conventional commits** (`feat:`, `fix:`, `test:`, `docs:`)
- **Use TypeScript** — no `any` types
- **Validate forms** with Mantine's `useForm` hook
- **Handle errors gracefully** with user-friendly messages
- **Use path aliases** (`@/` for `src/`)
- **Clear validation errors** when they become stale
- **Log errors** with `logger.error()` in API routes

### ⚠️ Ask First

- **DynamoDB table or index changes** (CDK deploy required)
- **Breaking API changes** (affects existing RSVPs)
- **New dependencies** (check bundle size impact)
- **Authentication flow changes** (security implications)
- **Major refactoring** (coordinate with ongoing work)
- **Changing color scheme** (affects brand consistency)
- **Modifying test data structure** (breaks existing tests)
- **Adding vars to next.config.js env section** (affects Lambda runtime)

### 🚫 Never Do

- **Commit directly to main** (always use feature branches)
- **Skip tests** for new features
- **Disable ESLint rules** without explanation
- **Use inline styles** instead of Tailwind/Mantine
- **Hardcode credentials** or API keys
- **Use `any` type** in TypeScript
- **Disable form validation** with `{ force: true }` on submit buttons
- **Add AI attribution** to commit messages
- **Remove error handling** to "simplify" code
- **Use `form.isValid()` to disable submit buttons** (prevents error display)
- **Merge PRs yourself** — always leave PRs open for the user to review and merge

## Database Context

The site uses **DynamoDB** (on-demand billing) accessed via the AWS SDK **Document Client** using IAM credentials. `src/utils/db/dynamo.ts` holds the client singleton and table name constants; typed repositories live in `src/utils/db/archive.ts`, `src/utils/db/photos.ts`, and `src/utils/db/categories.ts`.

### Key Tables

- **wedding-archive**: Frozen post-wedding data in a single-table design — PK/SK pairs `CODE#<code>/META`, `INVITATION#<id>/META`, `INVITATION#<id>/RSVP#<id>`, `INVITATION#<id>/INVITEE#<id>`. Code validation is a `GetItem`; dashboard reads scan all ~137 items.
- **wedding-photos**: PK `id` (uuid). GSIs: `byStatus` (status + uploaded_at), `byCode` (invitation_code + uploaded_at, for rate limiting), `byS3Key` (s3_key, used by the photo-processor Lambda). Point-in-time recovery enabled.
- **wedding-photo-categories**: PK `id`. ~7 items.

### Environment Variables (development `.env.local`)

- `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET`
- `DDB_ARCHIVE_TABLE` / `DDB_PHOTOS_TABLE` / `DDB_CATEGORIES_TABLE` (defaults match the production table names)
- `LAMBDA_AWS_KEY_ID` / `LAMBDA_AWS_SECRET`
- Never commit `.env.local` (gitignored)

## Common Patterns

### Client-Side Data Fetching
```tsx
const [data, setData] = useState<RSVPData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    fetch(`/api/rsvp/${code}`)
        .then(r => {
            if (!r.ok) throw new Error("Failed to load data");
            return r.json();
        })
        .then(setData)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
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

<form onSubmit={form.onSubmit(() => setShowConfirmation(true))}>
    <Button type="submit" disabled={submitting}>Submit</Button>
</form>

<Modal opened={showConfirmation}>
    <Button onClick={() => handleSubmit(form.values)}>Confirm & Submit</Button>
</Modal>
```

## External Review Bots

This project uses external AI agents for PR review:

- **Claude Code Review** (`.github/workflows/claude-code-review.yml`): reviews every non-draft, non-bot PR on open and on each push. Posts a single tracking comment that it updates in place, plus inline comments on specific lines. The action version is pinned; bump it deliberately.
- **Codex (OpenAI)**: Automated code analysis on pull requests
- **Cursor Bot**: AI-powered code review assistant

These bots provide feedback on code quality, potential bugs, and best practices. Their suggestions are advisory and require human review.

## Working with This Codebase

1. **Start Here**: Read `README.md` for setup instructions
2. **Understand the RSVP Flow**: Check `docs/RSVP_SYSTEM_README.md`
3. **Testing**: Review `docs/TESTING.md`
4. **Security**: See `docs/SECURITY.md` for implemented protections
5. **Infrastructure**: See `docs/AWS_RESOURCES.md` for AWS resource details
6. **Make Changes**: Always create a feature branch (`feat/`, `fix/`, `test/`)
7. **Test Your Changes**: Run unit tests (`npm test`)
8. **Commit**: Follow conventional commits format
9. **Push**: GitHub Actions will run CI checks

## Questions to Ask Yourself

Before implementing a feature:

- ✅ Does this need to work on mobile?
- ✅ Is this accessible (keyboard navigation, screen readers)?
- ✅ What happens if the API call fails?
- ✅ Have I covered this with unit tests?
- ✅ Will this affect existing RSVPs in the database?
- ✅ Is this change documented in the relevant README?
- ✅ Does a new env var need to be added to `next.config.js` `env` section?

---

**Last Updated**: July 2026

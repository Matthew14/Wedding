# Wedding

Rebecca & Matthew's Wedding Website — built with Next.js 15, TypeScript, Mantine UI, and AWS.

## Features

- **Homepage**: Elegant hero section with couple's wedding photo
- **Location**: Complete venue details for Gran Villa Rosa with integrated Google Maps, travel information, and parking details
- **Schedule**: Comprehensive 3-day wedding timeline with detailed activities for each day
- **RSVP System**: Complete RSVP form system with unique invitation codes, guest management, form validation, and response tracking
- **Admin Dashboard**: Secure dashboard for managing invitations and RSVP responses
- **Responsive Design**: Mobile-first approach with custom styling and smooth animations
- **SEO Optimized**: Proper meta tags, Open Graph data, and social sharing
- **Custom Styling**: Beautiful brown/gold color scheme with hover effects and smooth transitions
- **Testing**: Comprehensive unit testing with Vitest and React Testing Library

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Mantine Components v7.15.2
- **Database**: DynamoDB (on-demand billing)
- **Auth**: AWS Cognito
- **Hosting**: AWS Amplify (WEB_COMPUTE)
- **Photos CDN**: CloudFront → S3
- **Styling**: Custom CSS with Mantine integration
- **Icons**: Tabler Icons
- **Fonts**: Geist Sans & Geist Mono
- **Testing**: Vitest with React Testing Library (unit tests)

## Getting Started

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and fill in the values:

    ```bash
    cp .env.example .env.local
    ```

   You'll need:
   - Cognito user pool ID, client ID, and client secret
   - DynamoDB table names (`DDB_ARCHIVE_TABLE`, `DDB_PHOTOS_TABLE`, `DDB_CATEGORIES_TABLE`) — defaults match the production tables
   - IAM access keys for the `wedding-api-lambda` user

3. **Run development server**:

    ```bash
    npm run dev
    ```

4. **Open [http://localhost:3022](http://localhost:3022)** in your browser

## Project Structure

```
Wedding/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   │   ├── auth/      # Login/logout endpoints
│   │   │   ├── dashboard/ # Dashboard summary endpoint
│   │   │   └── rsvp/      # RSVP API endpoints
│   │   ├── dashboard/     # Admin dashboard (protected)
│   │   │   └── invitations/ # Invitation management
│   │   ├── location/      # Location page with Google Maps & venue details
│   │   ├── login/         # Admin login page
│   │   ├── rsvp/          # RSVP pages (entry, form, success)
│   │   ├── schedule/      # 3-day wedding schedule with timeline
│   │   ├── globals.css    # Global styles and custom CSS
│   │   ├── layout.tsx     # Root layout with Mantine provider
│   │   └── page.tsx       # Homepage with hero section
│   ├── components/        # Reusable components
│   │   ├── Navigation.tsx # Responsive navigation bar
│   │   └── Navigation.module.css
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx # Authentication context
│   ├── hooks/             # Custom React hooks
│   ├── test/              # Test utilities and setup
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
│       ├── auth/          # Cognito auth helpers
│       ├── db/            # DynamoDB client + typed repositories
│       └── logger.ts      # CloudWatch structured logger
├── public/
│   ├── favicon.ico        # Custom wedding favicon
│   └── rebecca-matthew-wedding-photo-2.jpeg # Hero image
├── package.json           # Dependencies and scripts
├── next.config.js         # Next.js configuration (bakes env vars for Lambda)
├── vitest.config.ts       # Vitest test configuration
├── tsconfig.json         # TypeScript configuration
├── postcss.config.mjs    # PostCSS configuration
└── eslint.config.mjs     # ESLint configuration
```

## Customization

- **Couple Names**: Update names in `src/app/layout.tsx` metadata and throughout components
- **Hero Image**: Replace `/rebecca-matthew-wedding-photo-2.jpeg` in `public/` and update `src/app/page.tsx`
- **Color Scheme**: Modify the brown/gold theme (`#8b7355`) in `globals.css` and component styles
- **Wedding Details**: Update venue information, dates, and timeline in respective page components
- **Google Maps**: The location page includes Gran Villa Rosa map integration — update coordinates if needed
- **Schedule**: Customize the 3-day timeline with your specific activities and timing

## Infrastructure

All resources run in AWS account `084032333902`, region `eu-west-1`:

- **Amplify**: Hosts the Next.js app with auto-deploy on push to `main`
- **DynamoDB**: On-demand tables (`wedding-archive`, `wedding-photos`, `wedding-photo-categories`)
- **Cognito**: Admin user authentication
- **CloudFront + S3**: Wedding photo CDN
- **CloudWatch**: Application logs at `/wedding/app` (90-day retention)

See `docs/AWS_RESOURCES.md` for full resource inventory.

## Current Pages & Content

- **Homepage** (`/`): Wedding photo and thank-you message
- **Location** (`/location`): Full venue details for Gran Villa Rosa with embedded Google Maps
- **Schedule** (`/schedule`): Detailed 3-day wedding timeline
- **RSVP** (`/rsvp`): RSVP entry page where guests enter their invitation code
- **RSVP Form** (`/rsvp/[code]`): Dynamic RSVP form with attendance confirmation, dietary restrictions, song requests
- **RSVP Success** (`/rsvp/success`): Confirmation page after successful RSVP submission
- **Login** (`/login`): Admin login page for dashboard access
- **Dashboard** (`/dashboard`): Admin dashboard for managing invitations (protected route)

## Development Status

✅ **Complete**: Homepage, Location, Schedule pages with full content and styling
✅ **Complete**: Responsive navigation, custom styling, and animations
✅ **Complete**: Database connection (DynamoDB)
✅ **Complete**: RSVP system with invitation codes, form submission, and response tracking
✅ **Complete**: Admin dashboard with invitation management
✅ **Complete**: Authentication system (Cognito) with protected routes
✅ **Complete**: Comprehensive unit testing with Vitest and React Testing Library
⏳ **Planned**: Photo gallery section to showcase photos
⏳ **Planned**: End-to-end test suite (the previous Cypress suite was removed pending a rewrite)

## Testing

This project uses unit and integration tests with Vitest. See [docs/TESTING.md](docs/TESTING.md) for the full guide.

> **Note**: End-to-end (Cypress) tests have been removed for now and will be rewritten as a new suite.

### Running Unit Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Additional Documentation

- **[docs/AWS_RESOURCES.md](docs/AWS_RESOURCES.md)**: AWS resource inventory and cost estimates
- **[docs/RSVP_SYSTEM_README.md](docs/RSVP_SYSTEM_README.md)**: Detailed documentation for the RSVP system
- **[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)**: Running the full stack locally with LocalStack (S3, DynamoDB, Cognito)
- **[docs/TESTING.md](docs/TESTING.md)**: Comprehensive unit testing guide and best practices
- **[docs/SECURITY.md](docs/SECURITY.md)**: Security implementation and best practices
- **[AGENTS.md](AGENTS.md)**: Information about automated PR review bots and agents

## Deployment

The site deploys automatically via AWS Amplify on every push to `main`. Environment variables are set in the Amplify console and baked into the Lambda bundle at build time via `next.config.js`.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

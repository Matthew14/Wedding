# Wedding

Rebecca & Matthew's Wedding Website - A wedding website built with Next.js 15, TypeScript, Mantine UI, and Supabase.

## Features

- **Homepage**: Elegant hero section with couple's engagement photo and call-to-action buttons
- **Location**: Complete venue details for Gran Villa Rosa with integrated Google Maps, travel information, and parking details
- **Schedule**: Comprehensive 3-day wedding timeline with detailed activities for each day
- **FAQs**: Frequently asked questions with expandable accordion interface and admin editor
- **RSVP System**: Complete RSVP form system with unique invitation codes, guest management, form validation, and response tracking
- **Admin Dashboard**: Secure dashboard for managing FAQs, invitations, and RSVP responses
- **Responsive Design**: Mobile-first approach with custom styling and smooth animations
- **SEO Optimized**: Proper meta tags, Open Graph data, and social sharing
- **Custom Styling**: Beautiful brown/gold color scheme with hover effects and smooth transitions
- **Testing**: Comprehensive unit testing with Vitest and React Testing Library, E2E testing with Cypress

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Mantine Components v7.15.2
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Custom CSS with Mantine integration
- **Icons**: Tabler Icons
- **Fonts**: Geist Sans & Geist Mono
- **Testing**: Vitest with React Testing Library (unit tests), Cypress (E2E tests)

## Getting Started

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Set up Supabase**:
   Start the local Supabase instance (requires Docker):

    ```bash
    npm run supabase:start
    ```

3. **Set up environment variables**:
   Copy `.env.local` and add your Supabase credentials:

    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4. **Run development server**:

    ```bash
    npm run dev
    ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Project Structure

```
Wedding/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   │   ├── faqs/      # FAQ API endpoints
│   │   │   └── rsvp/      # RSVP API endpoints
│   │   ├── dashboard/     # Admin dashboard (protected)
│   │   │   ├── faq-editor/ # FAQ management
│   │   │   └── invitations/ # Invitation management
│   │   ├── faqs/          # FAQs page with accordion interface
│   │   ├── location/      # Location page with Google Maps & venue details
│   │   ├── login/         # Admin login page
│   │   ├── rsvp/          # RSVP pages (entry, form, success)
│   │   ├── schedule/      # 3-day wedding schedule with timeline
│   │   ├── globals.css    # Global styles with Tailwind & custom CSS
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
│       └── supabase/      # Supabase client setup
│           ├── client.ts  # Client-side Supabase client
│           ├── server.ts  # Server-side Supabase client
│           └── middleware.ts # Middleware utilities
├── public/
│   ├── favicon.ico        # Custom wedding favicon
│   └── rebecca-matthew-wedding-photo.jpeg # Hero image
├── package.json           # Dependencies and scripts
├── next.config.js         # Next.js configuration
├── vitest.config.ts       # Vitest test configuration
├── tsconfig.json         # TypeScript configuration
├── postcss.config.mjs    # PostCSS with Tailwind
└── eslint.config.mjs     # ESLint configuration
```

## Customization

- **Couple Names**: Update names in `src/app/layout.tsx` metadata and throughout components
- **Hero Image**: Replace `/rebecca-matthew-wedding-photo.jpeg` in `public/` directory and update `src/app/page.tsx`
- **Color Scheme**: Modify the brown/gold theme (`#8b7355`) in `globals.css` and component styles
- **Wedding Details**: Update venue information, dates, and timeline in respective page components
- **Google Maps**: The location page includes Gran Villa Rosa map integration - update coordinates if needed
- **FAQs**: Manage questions and answers through the admin dashboard at `/dashboard/faq-editor`
- **Schedule**: Customize the 3-day timeline with your specific activities and timing

## Database

The site uses Supabase as the database backend. You'll need to create the necessary tables in your Supabase project for features like RSVPs and FAQs.

## Current Pages & Content

- **Homepage** (`/`): Complete with hero image, couple introduction, and navigation to key pages
- **Location** (`/location`): Full venue details for Gran Villa Rosa with embedded Google Maps, travel information, and parking details
- **Schedule** (`/schedule`): Detailed 3-day wedding timeline with activities for each day including welcome events, ceremony, reception, and farewell celebration
- **FAQs** (`/faqs`): Frequently asked questions with accordion interface, managed through admin dashboard
- **RSVP** (`/rsvp`): RSVP entry page where guests enter their invitation code
- **RSVP Form** (`/rsvp/[code]`): Dynamic RSVP form with attendance confirmation, dietary restrictions, song requests, and more
- **RSVP Success** (`/rsvp/success`): Confirmation page after successful RSVP submission
- **Login** (`/login`): Admin login page for dashboard access
- **Dashboard** (`/dashboard`): Admin dashboard for managing FAQs and invitations (protected route)

## Development Status

✅ **Complete**: Homepage, Location, Schedule pages with full content and styling  
✅ **Complete**: Responsive navigation, custom styling, and animations  
✅ **Complete**: Database connection setup  
✅ **Complete**: RSVP system with invitation codes, form submission, and response tracking  
✅ **Complete**: Admin dashboard with FAQ editor and invitation management  
✅ **Complete**: Authentication system with protected routes  
✅ **Complete**: Comprehensive unit testing with Vitest and React Testing Library  
⏳ **Planned**: Photo gallery section to showcase photos once the wedding has taken place

## Testing

This project includes comprehensive testing at multiple levels. See [TESTING.md](TESTING.md) for detailed unit testing information and [cypress/README.md](cypress/README.md) for E2E testing documentation.

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

### Running E2E Tests

```bash
# Run E2E tests (automated)
npm run test:e2e

# Open Cypress in interactive mode
npm run cypress:open

# Run Cypress tests in headless mode
npm run cypress:run
```

## Additional Documentation

- **[docs/RSVP_SYSTEM_README.md](docs/RSVP_SYSTEM_README.md)**: Detailed documentation for the RSVP system
- **[docs/TESTING.md](docs/TESTING.md)**: Comprehensive unit testing guide and best practices
- **[cypress/README.md](cypress/README.md)**: E2E testing setup, configuration, and test coverage
- **[docs/E2E_TEST_REVIEW.md](docs/E2E_TEST_REVIEW.md)**: Detailed review of E2E test logic and quality
- **[docs/SECURITY.md](docs/SECURITY.md)**: Security implementation and best practices

## Deployment

The site is ready for deployment on Vercel, Netlify, or any Next.js-compatible platform.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This wedding website template is open source and available for others to use for their own weddings or as inspiration for similar projects.

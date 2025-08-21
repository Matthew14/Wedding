# Wedding

Rebecca & Matthew's Wedding Website - A wedding website built with Next.js 15, TypeScript, Mantine UI, and Supabase.

## Features

- **Homepage**: Elegant hero section with couple's engagement photo and call-to-action buttons
- **Location**: Complete venue details for Gran Villa Rosa with integrated Google Maps, travel information, and parking details
- **Schedule**: Comprehensive 3-day wedding timeline with detailed activities for each day
- **FAQs**: Frequently asked questions with expandable accordion interface
- **Responsive Design**: Mobile-first approach with custom styling and smooth animations
- **SEO Optimized**: Proper meta tags, Open Graph data, and social sharing
- **Custom Styling**: Beautiful brown/gold color scheme with hover effects and smooth transitions

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Mantine Components v7.15.2
- **Database**: Supabase with Prisma ORM (PostgreSQL)
- **Styling**: Tailwind CSS + Custom CSS with Mantine integration
- **Icons**: Tabler Icons
- **Fonts**: Geist Sans & Geist Mono

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_database_url
   ```

3. **Set up database**:
   ```bash
   npm run db:generate
   npm run db:push
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
│   │   ├── faqs/           # FAQs page with accordion interface
│   │   ├── location/       # Location page with Google Maps & venue details
│   │   ├── schedule/       # 3-day wedding schedule with timeline
│   │   ├── globals.css     # Global styles with Tailwind & custom CSS
│   │   ├── layout.tsx      # Root layout with Mantine provider
│   │   └── page.tsx        # Homepage with hero section
│   ├── components/         # Reusable components
│   │   ├── Navigation.tsx  # Responsive navigation bar
│   │   └── Navigation.module.css
│   └── lib/               # Utility libraries
│       ├── prisma.ts      # Prisma client setup
│       └── supabase.ts    # Supabase client setup
├── prisma/
│   └── schema.prisma      # Database schema with RSVP model
├── public/
│   ├── favicon.svg        # Custom wedding favicon
│   └── rebecca-matthew-wedding-photo.jpeg # Hero image
├── package.json           # Dependencies and scripts
├── next.config.ts         # Next.js configuration
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
- **FAQs**: Add more questions and answers in `src/app/faqs/page.tsx`
- **Schedule**: Customize the 3-day timeline with your specific activities and timing

## Database Schema

The site includes a ready-to-use RSVP model in `prisma/schema.prisma` with PostgreSQL:

```prisma
model RSVP {
  id        String   @id @default(cuid())
  name      String
  email     String
  attending Boolean
  guestCount Int     @default(1)
  dietaryRestrictions String?
  message   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("rsvps")
}
```

**Note**: The RSVP functionality is set up but not yet implemented in the UI. The database structure is ready for when you want to add an RSVP form.

## Current Pages & Content

- **Homepage** (`/`): Complete with hero image, couple introduction, and navigation to key pages
- **Location** (`/location`): Full venue details for Gran Villa Rosa with embedded Google Maps, travel information, and parking details
- **Schedule** (`/schedule`): Detailed 3-day wedding timeline with activities for each day including welcome events, ceremony, reception, and farewell celebration
- **FAQs** (`/faqs`): Basic structure with accordion interface (currently has minimal content - ready for expansion)

## Development Status

✅ **Complete**: Homepage, Location, Schedule pages with full content and styling  
✅ **Complete**: Responsive navigation, custom styling, and animations  
✅ **Complete**: Database schema and connection setup  
🔄 **In Progress**: FAQ content (structure ready, needs more questions/answers)  
⏳ **Planned**: RSVP form implementation  
⏳ **Planned**: Additional interactive features

## Unimplemented Features

The following features are planned but not yet implemented:

- **RSVP System**: A complete RSVP form where guests can confirm attendance, specify guest count, dietary restrictions, and leave messages. The database schema is ready in `prisma/schema.prisma`.

- **Gallery**: A photo gallery section to showcase photos once the wedding has taken place
 

## Deployment

The site is ready for deployment on Vercel, Netlify, or any Next.js-compatible platform.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This wedding website template is open source and available for others to use for their own weddings or as inspiration for similar projects.
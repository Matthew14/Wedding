# Security Implementation Summary

This document outlines the security measures implemented in the wedding website.

## ✅ Implemented Security Features

### 1. Debug Logging Protection

- **What**: Conditional logging that only runs in development mode
- **Why**: Prevents sensitive information from being logged in production
- **Location**: `src/middleware.ts`
- **Implementation**: All `console.log` statements wrapped in `process.env.NODE_ENV === 'development'` checks

### 2. Security Headers

- **What**: HTTP security headers to protect against common attacks
- **Why**: Prevents clickjacking, XSS, MIME-type sniffing, and other attacks
- **Location**: `next.config.js`
- **Headers Implemented**:
    - `X-Frame-Options: DENY` - Prevents clickjacking
    - `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
    - `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
    - `X-XSS-Protection: 1; mode=block` - Enables XSS filtering
    - `Permissions-Policy` - Restricts access to browser features
    - `Content-Security-Policy` - Prevents XSS and other injection attacks

### 3. XSS Protection

- **What**: Automatic HTML escaping via React's JSX rendering
- **Why**: Prevents XSS attacks by escaping potentially dangerous characters
- **Implementation**:
    - React automatically escapes all text content rendered in JSX
    - FAQ data is displayed as plain text (no `dangerouslySetInnerHTML`)
    - Input validation and trimming in API routes (`src/app/api/faqs/`)
    - Admin-only access for FAQ creation/editing through authentication

### 4. Rate Limiting

- **What**: Request limiting for public API endpoints
- **Why**: Prevents brute-force attacks, API abuse, and reduces costs
- **Location**: `src/utils/api/rateLimit.ts` (reusable utility)
- **Protected Endpoints**:
    - `/api/rsvp/validate/[code]` - 5 requests/minute (strictest, prevents code guessing)
    - `/api/rsvp/[code]` - 20 requests/minute (RSVP form submission)
    - `/api/invitation/[slug]` - 30 requests/minute (invitation lookup)
    - `/api/generate-faq-id` - 10 requests/minute (OpenAI cost protection)
- **Implementation**: In-memory rate limiter with per-IP tracking and validation
- **Security Features**:
    - IP format validation prevents header spoofing attacks
    - Automatic memory cleanup prevents resource exhaustion
    - Rate limit headers on all responses for client backoff
- **Response**: Returns HTTP 429 with `Retry-After` header and rate limit metadata

## 🔒 Existing Security Features

### Authentication & Authorization

- **Supabase Authentication**: Email/password authentication via Supabase Auth
- **Route Protection**: Middleware-based protection for admin routes (`/dashboard/*`)
- **Session Management**: Secure session handling via Supabase with automatic refresh

**Authentication Flow:**
1. User submits credentials to `/login` page
2. `AuthContext` calls `supabase.auth.signInWithPassword()`
3. Supabase validates credentials and returns JWT session
4. Session stored in browser cookies (managed by Supabase)
5. Middleware checks session on protected routes
6. Unauthenticated users redirected to `/login` with return URL
7. Already-authenticated users on `/login` redirected to `/dashboard`

**Protected Routes:**
- `/dashboard/*` - Requires authenticated session
- `/api/faqs/*` (POST, PUT, DELETE) - Requires authenticated session via RLS

### Environment Security

- **Environment Variables**: All secrets stored in `.env.local`
- **No Hardcoded Secrets**: All API keys and sensitive data externalized

### Dependencies

- **Up-to-date Packages**: All dependencies regularly updated
- **Vulnerability Scanning**: `npm audit` shows 0 vulnerabilities

### 5. Row Level Security (RLS)

- **What**: PostgreSQL RLS policies to control database access
- **Why**: Defense-in-depth security layer beyond API validation
- **Location**: `supabase/migrations/20260106222120_secure_rls_policies.sql`
- **Implementation**:

| Table | Public SELECT | Public INSERT | Public UPDATE | Public DELETE |
|-------|--------------|---------------|---------------|---------------|
| invitation | ✅ | ❌ | ❌ | ❌ |
| RSVPs | ✅ | ❌ | ✅ | ❌ |
| invitees | ✅ | ❌ | ✅ | ❌ |
| FAQs | ✅ | ❌ | ❌ | ❌ |

**Policy Names:**
- `invitation_public_select` / `invitation_authenticated_all`
- `rsvps_public_select` / `rsvps_public_update` / `rsvps_authenticated_all`
- `invitees_public_select` / `invitees_public_update` / `invitees_authenticated_all`
- `faqs_public_select` / `faqs_authenticated_insert` / `faqs_authenticated_update` / `faqs_authenticated_delete`

**Security Model:**
- Public users can READ all data (acceptable for private wedding site)
- Public users can UPDATE RSVPs/invitees (API validates RSVP code first)
- Only authenticated users (admins) can INSERT/DELETE any data
- FAQs are read-only for public users; full CRUD for admins

### 6. API-Level Protections

- **What**: Server-side validation before database operations
- **Location**: `src/app/api/rsvp/[code]/route.ts`
- **Protections**:
    - RSVP code validation (6-character code required)
    - Invitee ownership validation (prevents cross-invitation updates)
    - Authentication required for FAQ management

## ⚠️ Known Limitations & Accepted Risks

### Anon Key Exposure

The Supabase anon key is exposed to browsers via `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This is necessary for client-side Supabase features and is an accepted trade-off:

**What this means:**
- Users could theoretically read all RSVP data via direct Supabase queries
- RLS prevents direct INSERT/DELETE but allows SELECT/UPDATE

**Why this is acceptable:**
- Guest list is not highly sensitive information
- Only invited guests receive the site URL
- No financial or PII data beyond names is stored
- API validates RSVP codes before allowing updates

**Mitigations in place:**
- RLS blocks INSERT/DELETE operations
- API validates invitee ownership before updates
- FAQs are read-only for public users

## 📊 Data Handling & Retention

### Data Collected
- **Guest Information**: First name, last name, RSVP status
- **RSVP Responses**: Attendance, accommodation preference, dietary restrictions, song requests, travel plans, messages
- **Analytics**: Page views, form interactions (via PostHog)
- **Admin Accounts**: Email addresses for dashboard access

### Data Retention Policy
- **RSVP Data**: Retained until wedding completion + 6 months for follow-up
- **Analytics Data**: Subject to PostHog retention settings
- **Session Data**: Automatically expires per Supabase defaults

### Data Access
- Guest data accessible only via valid RSVP code or admin dashboard
- No data sharing with third parties beyond hosting providers (Vercel, Supabase)
- PostHog analytics configured with privacy-respecting defaults

## 🇪🇺 GDPR Compliance Notes

This is a private wedding website with limited data collection:

### Lawful Basis
- **Legitimate Interest**: Processing necessary for wedding event management
- **Consent**: Guests voluntarily submit RSVP information

### Data Subject Rights
- **Access**: Guests can view their RSVP data via their unique code
- **Rectification**: Guests can update their RSVP until the cutoff date
- **Erasure**: Contact site administrator for data deletion requests

### Technical Measures
- Data minimization: Only essential information collected
- No cookies except functional (authentication, preferences)
- Analytics pseudonymized via RSVP codes

## 🚨 Incident Response

### Security Incident Procedures

1. **Detection**: Monitor for unusual activity in Supabase logs and Vercel analytics
2. **Containment**: Disable affected RSVP codes or rotate API keys if needed
3. **Assessment**: Determine scope and impact of incident
4. **Notification**: Inform affected parties if personal data compromised
5. **Recovery**: Restore from database backups if necessary
6. **Review**: Document incident and update security measures

### Emergency Actions
- **Rotate Supabase Keys**: Via Supabase Dashboard > Settings > API
- **Disable Public Access**: Update RLS policies to restrict SELECT
- **Reset Admin Passwords**: Via Supabase Dashboard > Authentication

## 🛡️ Additional Recommendations

For production deployment, consider:

1. ~~**Database Security**: Enable Row Level Security (RLS) policies in Supabase~~ ✅ Done
2. **HTTPS Only**: Ensure all traffic uses HTTPS
3. **Domain Validation**: Implement CORS policies for specific domains
4. **Monitoring**: Add security monitoring and alerting
5. **Backup Strategy**: Regular database backups
6. **Access Logging**: Monitor admin access patterns

## 📝 Security Checklist

- [x] Remove debug logging from production
- [x] Add security headers
- [x] Implement input sanitization
- [x] Add rate limiting for external APIs
- [x] Add rate limiting for public endpoints (RSVP, invitation)
- [x] Validate all user inputs
- [x] Use environment variables for secrets
- [x] Keep dependencies updated
- [x] Implement proper authentication
- [x] Protect admin routes
- [x] Enable Row Level Security (RLS) policies
- [x] Add invitee ownership validation

## 🚨 Security Contact

For security issues or concerns, please contact the website administrator.

---

Last updated: January 10, 2026
Risk Level: **LOW** - Suitable for personal wedding website with basic admin functionality.

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
    - `X-Frame-Options: DENY` — Prevents clickjacking
    - `X-Content-Type-Options: nosniff` — Prevents MIME-type sniffing
    - `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer information
    - `X-XSS-Protection: 1; mode=block` — Enables XSS filtering
    - `Permissions-Policy` — Restricts access to browser features
    - `Content-Security-Policy` — Prevents XSS and other injection attacks

### 3. XSS Protection

- **What**: Automatic HTML escaping via React's JSX rendering
- **Why**: Prevents XSS attacks by escaping potentially dangerous characters
- **Implementation**:
    - React automatically escapes all text content rendered in JSX
    - User-submitted content is displayed as plain text (no `dangerouslySetInnerHTML`)
    - Input validation and trimming in API routes (`src/app/api/`)
    - Admin-only access for content management through authentication

### 4. Rate Limiting

- **What**: Per-code limiting of guest photo uploads
- **Why**: Prevents a single invitation code from flooding the gallery or running up S3/Lambda costs
- **Location**: `/api/photos/upload-url` — counts a code's uploads in the last hour via the `byCode` DynamoDB GSI; 50/hour per code, HTTP 429 beyond that. The bride & groom's master code is exempt.
- **Historical note**: the per-IP limiter (`src/utils/api/rateLimit.ts`) protecting the RSVP endpoints was removed along with the RSVP system after the wedding. Code-validation endpoints (`/api/photos`, `/api/photos/validate-code`) rely on the 6-character alphanumeric keyspace (~2.2B) rather than per-IP throttling — an accepted trade-off for a low-value target; revisit if scripted enumeration ever shows up in the logs.

## 🔒 Authentication & Authorization

### AWS Cognito Authentication

- **Route Protection**: Middleware-based protection for admin routes (`/dashboard/*`)
- **Session Management**: JWT tokens stored in httpOnly cookies, validated on each request
- **Session Refresh**: the ID-token session cookie lives 1 hour; middleware transparently renews it from a 30-day httpOnly refresh-token cookie (Cognito `REFRESH_TOKEN_AUTH`), so admins stay signed in for up to 30 days without re-entering credentials
- **Revocation**: logout calls Cognito `GlobalSignOut`, which revokes the refresh token server-side — a leaked refresh cookie is useless after an explicit logout
- **Challenge Handling**: `NEW_PASSWORD_REQUIRED` challenge handled at login — forced password change on first login

**Authentication Flow:**
1. User submits credentials to `/login` page
2. API calls Cognito `InitiateAuthCommand`
3. If `NEW_PASSWORD_REQUIRED` challenge returned, user is prompted for new password
4. On success, Cognito returns access/ID/refresh tokens
5. Tokens stored in httpOnly browser cookies (session + access for 1 hour, refresh token + immutable username for 30 days)
6. Middleware validates the session on protected routes and APIs; when it has expired it mints fresh tokens from the refresh cookie before the request proceeds
7. Users are redirected to `/login` only when no valid session exists and the refresh token is missing, expired, or revoked

**Protected Routes:**
- `/dashboard/*` — Requires authenticated session

### Environment Security

- **Environment Variables**: All secrets stored in `.env.local` for dev; Amplify console for production
- **Lambda Env Baking**: Vars explicitly listed in `next.config.js` `env` section are baked into the Lambda bundle at build time
- **No Hardcoded Secrets**: All API keys and sensitive data externalized
- **IAM Least Privilege**: `wedding-api-lambda` IAM user has only a scoped DynamoDB managed policy (`GetItem`/`BatchGetItem`/`Query`/`Scan`/`PutItem`/`UpdateItem` on the three wedding tables and photos indexes, attached via CDK) and cloudwatch-logs permissions

### Dependencies

- **Up-to-date Packages**: All dependencies regularly updated
- **Vulnerability Scanning**: `npm audit` shows 0 vulnerabilities

### 5. API-Level Protections

- **What**: Server-side validation before database operations
- **Protections**:
    - RSVP code validation (6-character code required)
    - Invitee ownership validation (prevents cross-invitation updates)
    - Authentication required for the dashboard

## ⚠️ Known Limitations & Accepted Risks

### Over-Permissioned Admin IAM User

The `wedding-deploy` IAM user has `AdministratorAccess`. This is flagged for reduction to only the permissions needed for Amplify CLI operations. Current risk is low since the keys are only used locally.

## 📊 Data Handling & Retention

### Data Collected
- **Guest Information**: First name, last name, RSVP status
- **RSVP Responses**: Attendance, accommodation preference, dietary restrictions, song requests, travel plans, messages
- **Analytics**: Page views, form interactions (via PostHog)
- **Admin Accounts**: Email addresses for dashboard access

### Data Retention Policy
- **RSVP Data**: Retained until wedding completion + 6 months for follow-up
- **Analytics Data**: Subject to PostHog retention settings
- **Application Logs**: CloudWatch `/wedding/app` log group — 90-day retention

### Data Access
- Guest data accessible only via valid RSVP code or admin dashboard
- Photo gallery is code-access only: `/api/photos` requires a valid invitation code (or admin session); a `MASTER_INVITATION_CODE` env var defines the bride & groom's code, which is auto-filled for logged-in admins and exempt from the upload rate limit
- No data sharing with third parties beyond AWS (hosting, DB, auth) and PostHog (analytics)
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

1. **Detection**: Monitor CloudWatch logs at `/wedding/app` for unusual activity
2. **Containment**: Rotate IAM keys or disable Cognito user if needed
3. **Assessment**: Determine scope and impact of incident
4. **Notification**: Inform affected parties if personal data compromised
5. **Recovery**: Restore from DynamoDB point-in-time recovery (photos table) or the verified archive backup if necessary
6. **Review**: Document incident and update security measures

### Emergency Actions
- **Rotate IAM Keys**: AWS Console > IAM > Users > `wedding-api-lambda` > Security credentials
- **Rotate Cognito Client Secret**: Cognito console > App clients
- **Disable Admin Access**: Cognito console > Users > Disable user
- **Check Logs**: CloudWatch > Log groups > `/wedding/app`

## 📝 Security Checklist

- [x] Remove debug logging from production
- [x] Add security headers
- [x] Implement input sanitization
- [x] Add rate limiting for external APIs
- [x] Add rate limiting for public endpoints (RSVP, invitation)
- [x] Validate all user inputs
- [x] Use environment variables for secrets
- [x] Keep dependencies updated
- [x] Implement proper authentication (Cognito)
- [x] Protect admin routes
- [x] Handle NEW_PASSWORD_REQUIRED Cognito challenge
- [x] CloudWatch structured logging for API errors
- [ ] Scope down `wedding-deploy` IAM from AdministratorAccess

## 🚨 Security Contact

For security issues or concerns, please contact the website administrator.

---

Last updated: July 2026
Risk Level: **LOW** — Suitable for personal wedding website with basic admin functionality.

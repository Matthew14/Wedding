# Local Development with LocalStack

The app depends on three AWS services — **S3** (photo storage / presigned URLs),
**Aurora via the RDS Data API** (all database access), and **Cognito** (admin
auth). For local development these are emulated with [LocalStack](https://localstack.cloud),
so you can run the full stack — including the photo gallery — without touching
real AWS.

## Prerequisites

- **Docker** running (Docker Desktop or colima).
- A **LocalStack Base+ subscription**. RDS (Data API) and Cognito are paid-tier
  features. After subscribing, copy your auth token from the LocalStack dashboard.

## One-time setup

```bash
# 1. Make your LocalStack token available (shell, or a local .env for compose)
export LOCALSTACK_AUTH_TOKEN=ls-...

# 2. Start LocalStack
npm run localstack:up

# 3. Provision resources, apply the schema, seed test data
npm run localstack:bootstrap
```

`bootstrap` is idempotent-ish and creates:

- S3 bucket `wedding-photos-local` (with CORS for browser uploads + public-read
  on `uploads/thumbnail/*`)
- An RDS cluster + Secrets Manager secret backing the Data API
- The full `infra/sql/schema.sql`, plus seed data:
  - invitation code **`TEST01`**
  - the five photo categories
- A Cognito user pool with a confirmed admin user

It writes everything it discovers (cluster/secret ARNs, Cognito IDs/secret) to
**`.env.localstack`** (git-ignored).

## Running the app

```bash
npm run dev      # Next.js on http://localhost:3022, wired to LocalStack
```

- **Admin login:** `admin@oneill.wedding` / `WeddingLocal123!`
- **Invitation code (uploads):** `TEST01`

## Photo gallery flow

The S3→Lambda thumbnail trigger isn't emulated. Instead, run the processor
on demand:

```bash
# 1. Upload a photo at /gallery/upload using code TEST01
# 2. Generate thumbnails (emulates the photo-processor Lambda)
npm run localstack:process
# 3. Approve it in /dashboard/photos
# 4. View it in /gallery
```

You can also approve a photo directly without logging in:

```sql
UPDATE photos SET status = 'approved', approved_at = NOW() WHERE status = 'pending';
```

## How it works

The AWS SDK clients (`src/utils/storage.ts`, `src/utils/db/client.ts`,
`src/utils/auth/cognito.ts`) read **`AWS_ENDPOINT_URL`** and point at LocalStack
when it's set — production leaves it unset and hits real AWS. JWT verification
(`src/utils/auth/jwks.ts`) reads **`COGNITO_ISSUER`** to match the issuer
LocalStack stamps into its tokens. None of these affect production behaviour.

## Teardown

```bash
npm run localstack:down    # stop the container (state persists in ./.localstack)
```

RDS persistence is "limited support" on LocalStack — if the DB looks empty after
a restart, just re-run `npm run localstack:bootstrap`.

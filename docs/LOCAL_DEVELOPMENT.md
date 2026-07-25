# Local Development with LocalStack

The app depends on three AWS services — **S3** (photo storage / presigned URLs),
**DynamoDB** (all database access), and **Cognito** (admin
auth). For local development S3 and DynamoDB are emulated with the free
[LocalStack](https://localstack.cloud) **community image**, so the guest flows —
gallery, uploads, invitation codes — run without touching real AWS.

Cognito is a LocalStack paid-tier feature, so **admin dashboard login is not
available locally** on the community image. Photo approval has a CLI stand-in
(below); anything else admin-only needs the paid tier (the bootstrap script
still provisions Cognito automatically when it's available).

## Prerequisites

- **Docker** running (Docker Desktop or colima). No LocalStack account or
  token needed.

## Setup

```bash
# 1. Start LocalStack
npm run localstack:up

# 2. Provision resources and seed test data
npm run localstack:bootstrap
```

State does **not** persist across container restarts on the community image —
re-run `npm run localstack:bootstrap` after every `localstack:up`.

`bootstrap` is idempotent-ish and creates:

- S3 bucket `wedding-photos-local` (with CORS for browser uploads + public-read
  on `uploads/thumbnail/*`)
- The three DynamoDB tables — `wedding-archive`, `wedding-photos` (with its
  GSIs), and `wedding-photo-categories` — plus seed items:
  - invitation code **`TEST01`**
  - the seven photo categories
- On the paid tier only: a Cognito user pool with a confirmed admin user
  (skipped with a warning on the community image)

It writes everything it discovers (table names, and Cognito IDs/secret when
provisioned) to **`.env.localstack`** (git-ignored).

## Running the app

```bash
npm run dev      # Next.js on http://localhost:3022, wired to LocalStack
```

- **Invitation code (uploads):** `TEST01`
- **Admin login:** unavailable on the community image (paid tier only:
  `admin@oneill.wedding` / `WeddingLocal123!`)

## Photo gallery flow

The S3→Lambda thumbnail trigger isn't emulated. Instead, run the processor
on demand:

```bash
# 1. Upload a photo at /gallery/upload using code TEST01
# 2. Generate thumbnails (emulates the photo-processor Lambda) and approve
#    them in one go — there's no admin login locally to do it in the dashboard
npm run localstack:process -- --approve
# 3. View it in /gallery
```

Omit `--approve` to leave photos pending (e.g. to exercise the pending state).
You can also approve a photo directly:

```bash
# Find the pending photo's id
awslocal dynamodb scan --table-name wedding-photos \
  --projection-expression 'id, #s' --expression-attribute-names '{"#s": "status"}'

# Approve it
awslocal dynamodb update-item --table-name wedding-photos \
  --key '{"id": {"S": "<photo-id>"}}' \
  --update-expression 'SET #s = :s, approved_at = :t' \
  --expression-attribute-names '{"#s": "status"}' \
  --expression-attribute-values '{":s": {"S": "approved"}, ":t": {"S": "2026-01-01T00:00:00Z"}}'
```

## How it works

The AWS SDK clients (`src/utils/storage.ts`, `src/utils/db/dynamo.ts`,
`src/utils/auth/cognito.ts`) read **`AWS_ENDPOINT_URL`** and point at LocalStack
when it's set — production leaves it unset and hits real AWS. JWT verification
(`src/utils/auth/jwks.ts`) reads **`COGNITO_ISSUER`** to match the issuer
LocalStack stamps into its tokens. None of these affect production behaviour.

## Teardown

```bash
npm run localstack:down    # stop the container
```

The community image doesn't persist state, so every fresh start needs
`npm run localstack:bootstrap` again.

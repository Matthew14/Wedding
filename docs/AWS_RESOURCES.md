# AWS Resources — oneill.wedding

Account: **084032333902** (aws26oneill)  
Region: **eu-west-1** (Ireland) unless noted

---

## Hosting

### Amplify — `dpi3jr6xdlg0` (oneill-wedding)
**What it is:** The service that hosts and serves the wedding website.  
**What it does:** Pulls code from GitHub, builds the Next.js app, and makes it available at `oneill.wedding`. Every push to the `main` branch triggers an automatic rebuild and redeploy. It also manages the SSL certificate and custom domain.

---

## Database

### DynamoDB — `wedding-archive`
**What it is:** A serverless NoSQL table (on-demand billing) holding the frozen post-wedding data.  
**What it does:** Stores the archived invitations, invitation codes, RSVPs, and guest records in a single-table design. Invitation code validation is a single `GetItem`; the dashboard's "At a Glance" stats scan all ~137 items. On-demand billing means it costs nothing when idle.

Item layout (PK / SK):
| PK | SK | Purpose |
|---|---|---|
| `CODE#<code>` | `META` | The unique codes guests used to access their RSVP |
| `INVITATION#<id>` | `META` | One item per invitation group (family/couple) |
| `INVITATION#<id>` | `RSVP#<id>` | Frozen final RSVP responses |
| `INVITATION#<id>` | `INVITEE#<id>` | Frozen final guest attendance records |

### DynamoDB — `wedding-photos`
**What it is:** A serverless NoSQL table (on-demand billing) for the photo gallery metadata.  
**What it does:** One item per photo, keyed by `id` (uuid). Three global secondary indexes: `byStatus` (status + uploaded_at, full projection) drives the gallery and moderation views, `byCode` (invitation_code + uploaded_at, keys only) supports per-code upload rate limiting, and `byS3Key` (s3_key, keys only) lets the photo-processor Lambda find the item for an uploaded object. Point-in-time recovery is enabled.

### DynamoDB — `wedding-photo-categories`
**What it is:** A tiny serverless NoSQL table (on-demand billing).  
**What it does:** Stores the ~7 photo gallery categories, keyed by `id`.

### Aurora Serverless v2 — `weddingstack-auroracluster23d869c0-hexv7uynpwda` ⚠️ pending decommission ([#150](https://github.com/Matthew14/Wedding/issues/150))
**What it is:** The PostgreSQL database the site used before migrating to DynamoDB.  
**What it does:** Nothing anymore — the app reads exclusively from DynamoDB. Its data was loaded into `wedding-archive` with the one-off `scripts/migrate-archive-to-dynamodb.mjs` script. The cluster is kept temporarily while the cutover is verified and will be removed in a follow-up PR. A manual snapshot (`pre-dynamodb-migration-2026-07-09`) and a verified local backup exist.

---

## Photo Storage & Delivery

### S3 Bucket — `oneill-wedding-photos`
**What it is:** Cloud storage for the wedding photos.  
**What it does:** Stores all wedding photos. The bucket is completely private — no direct public access. Photos are only served through CloudFront (below).

### CloudFront — `dcnyn8qcxtw4k.cloudfront.net`
**What it is:** A content delivery network (CDN) that sits in front of the photo bucket.  
**What it does:** Serves wedding photos to website visitors from edge locations close to them, making loading fast. Also handles caching so the same photo isn't fetched from S3 every time.

### Rekognition Collection — `wedding-faces-2026`
**What it is:** An AI face recognition index.  
**What it does:** Will allow guests to find photos of themselves in the wedding gallery — you upload a selfie, and it returns all wedding photos containing your face. Not yet wired up to the gallery; set up ready for the photo feature.

---

## Authentication

### Cognito User Pool — `eu-west-1_M3B36eWfB` (wedding-admin)
**What it is:** A user directory that handles login for the admin dashboard.  
**What it does:** Stores admin credentials (currently just `matthew@matthewoneill.com`) and handles the sign-in flow at `/login`. Issues secure tokens that prove you're logged in; the dashboard checks these tokens on every request. Configured with strong password requirements (12+ chars, uppercase, number, symbol).

---

## Secrets

### Secrets Manager — `wedding/db-credentials` ⚠️ pending decommission ([#150](https://github.com/Matthew14/Wedding/issues/150))
**What it is:** A secure vault for the old Aurora database password.  
**What it does:** Nothing anymore — DynamoDB uses IAM credentials, not a stored password. Will be removed together with the Aurora cluster.

### Secrets Manager — `wedding/cognito-client-secret`
**What it is:** A secure vault for the Cognito app client secret.  
**What it does:** Stores the secret used to authenticate server-side Cognito API calls (like signing in). Needed because the Cognito user pool client is configured with a secret for added security.

---

## Networking

### VPC — `WeddingVpc` (10.0.0.0/16) ⚠️ pending decommission ([#150](https://github.com/Matthew14/Wedding/issues/150))
**What it is:** A private, isolated network inside AWS.  
**What it does:** Only exists to house the old Aurora database — DynamoDB doesn't need a VPC. Will be removed together with the Aurora cluster.

### Default VPC (172.31.0.0/16)
**What it is:** An empty network AWS creates automatically in every account.  
**What it does:** Nothing for this project. It's harmless and costs nothing. Every AWS account has one.

---

## IAM (Access Control)

### IAM User — `wedding-deploy`
**What it is:** The admin user used for managing the site from the command line.  
**What it does:** This is what the `[wedding]` profile in `~/.aws/credentials` authenticates as. Used for running CDK deployments, managing Amplify, and interacting with AWS from your terminal.  
⚠️ Currently has full `AdministratorAccess` — should be scoped down to only the services needed.

### IAM User — `wedding-api-lambda`
**What it is:** A minimal-permission user for the live website to access the database.  
**What it does:** The Amplify Lambda (which runs the server-side code on the live site) uses this user's credentials to call DynamoDB. A scoped managed policy (attached via CDK) allows exactly `GetItem`, `BatchGetItem`, `Query`, `Scan`, `PutItem`, and `UpdateItem` on the three wedding tables and the photos indexes. Nothing else.

### IAM Role — `amplify-wedding-ssr-role`
**What it is:** A role for Amplify's deployment and runtime service.  
**What it does:** Amplify assumes this role when building and deploying the app. Also has Aurora and Secrets Manager permissions as a fallback, though in practice the `wedding-api-lambda` credentials are what the Lambda uses at runtime.

### IAM Role — `AWSAmplifyDomainRole-*`
**What it is:** Auto-created by Amplify when setting up the custom domain.  
**What it does:** Allows Amplify to make DNS changes for `oneill.wedding` during domain verification and renewal. You don't interact with this directly.

---

## Infrastructure Management (CDK)

### CloudFormation Stack — `WeddingStack`
**What it is:** The record of everything CDK has deployed.  
**What it does:** AWS CloudFormation tracks the DynamoDB tables, Cognito pool, S3 bucket, CloudFront, Rekognition collection, and (until decommissioned) the Aurora cluster and VPC as a single managed unit. If you run `cdk deploy` it updates this stack. If you run `cdk destroy` it tears all of it down cleanly.

### CloudFormation Stack — `CDKToolkit`
**What it is:** CDK's own bootstrapping stack.  
**What it does:** Sets up the S3 bucket and IAM roles that CDK needs to deploy your infrastructure. Created once via `cdk bootstrap` and then left alone.

### S3 Bucket — `cdk-hnb659fds-assets-084032333902-eu-west-1`
**What it is:** CDK's staging bucket.  
**What it does:** CDK uploads deployment artifacts here (Lambda code, CloudFormation templates) before deploying them. Managed entirely by CDK — don't modify it manually.

### Lambda — `WeddingStack-AWS679f53fac...`
**What it is:** A one-time setup function created by CDK.  
**What it does:** Ran once during the CDK deployment to retrieve the Cognito client secret and store it in Secrets Manager. It's dormant now but CDK keeps it around to manage stack state.

---

## Cost Summary (approximate)

| Service | ~Monthly Cost |
|---|---|
| DynamoDB (on-demand) | Cents |
| Aurora Serverless v2 (pending decommission, #150) | ~$0.55 |
| Amplify Hosting | ~$0.01/build + $0.15/GB served |
| CloudFront | Free tier / cents |
| S3 | Cents |
| Cognito | Free (under 50 MAU) |
| Secrets Manager | ~$0.80 (2 secrets) |
| Rekognition | Free until used |
| **Total** | **~$1.50–2.00/month** |

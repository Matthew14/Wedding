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

### Aurora Serverless v2 — `weddingstack-auroracluster23d869c0-hexv7uynpwda`
**What it is:** A PostgreSQL database that scales automatically with usage.  
**What it does:** Stores all the wedding data — RSVPs, invitation codes, guest lists, FAQ entries, and the archived historical records (`rsvp_archive`, `invitee_archive`). The dashboard reads from this database to show the "At a Glance" stats. Scales down to minimal capacity when idle to keep costs low.

Tables:
| Table | Purpose |
|---|---|
| `invitations` | One row per invitation group (family/couple) |
| `invitation_codes` | The unique codes guests used to access their RSVP |
| `rsvp_archive` | Frozen final RSVP responses |
| `invitee_archive` | Frozen final guest attendance records |
| `faqs` | Content for the FAQ section of the website |

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

### Secrets Manager — `wedding/db-credentials`
**What it is:** A secure vault for the database password.  
**What it does:** Stores the Aurora username and password. The app retrieves it at runtime rather than hardcoding it anywhere. Rotated automatically by AWS.

### Secrets Manager — `wedding/cognito-client-secret`
**What it is:** A secure vault for the Cognito app client secret.  
**What it does:** Stores the secret used to authenticate server-side Cognito API calls (like signing in). Needed because the Cognito user pool client is configured with a secret for added security.

---

## Networking

### VPC — `WeddingVpc` (10.0.0.0/16)
**What it is:** A private, isolated network inside AWS.  
**What it does:** The Aurora database lives inside this VPC with no direct internet access. This means the database can't be reached from the internet at all — only AWS services with the right permissions (via the Data API) can talk to it.

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
**What it does:** The Amplify Lambda (which runs the server-side code on the live site) uses this user's credentials to call the Aurora Data API. It has permission to do exactly two things: query Aurora and read the DB secret. Nothing else.

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
**What it does:** AWS CloudFormation tracks the Aurora cluster, VPC, Cognito pool, S3 bucket, CloudFront, and Rekognition collection as a single managed unit. If you run `cdk deploy` it updates this stack. If you run `cdk destroy` it tears all of it down cleanly.

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
| Aurora Serverless v2 (0.5 ACU min) | ~$0.55 |
| Amplify Hosting | ~$0.01/build + $0.15/GB served |
| CloudFront | Free tier / cents |
| S3 | Cents |
| Cognito | Free (under 50 MAU) |
| Secrets Manager | ~$0.80 (2 secrets) |
| Rekognition | Free until used |
| **Total** | **~$1.50–2.00/month** |

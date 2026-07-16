#!/usr/bin/env bash
#
# Provisions all the AWS resources the app needs against a running LocalStack
# instance, creates the DynamoDB tables, seeds a test invitation code + photo
# categories + an admin user, and writes the discovered values to .env.localstack.
#
# Prereqs:  docker compose up (npm run localstack:up) + LocalStack reachable on :4566
# Usage:    npm run localstack:bootstrap
#
set -euo pipefail

REGION="eu-west-1"
ENDPOINT="http://localhost:4566"
# LocalStack stamps Cognito tokens with this external host in their `iss` claim,
# so JWT verification must use it (not plain localhost) as the issuer + JWKS host.
ISSUER_ENDPOINT="http://localhost.localstack.cloud:4566"
BUCKET="wedding-photos-local"
ARCHIVE_TABLE="wedding-archive"
PHOTOS_TABLE="wedding-photos"
CATEGORIES_TABLE="wedding-photo-categories"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@oneill.wedding}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-WeddingLocal123!}"
SEED_CODE="TEST01"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.localstack"

# Force LocalStack dummy creds regardless of the developer's AWS profile.
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$REGION"
unset AWS_PROFILE || true

awsl() { aws --endpoint-url="$ENDPOINT" "$@"; }

echo "→ Checking LocalStack is up..."
if ! curl -sf "${ENDPOINT}/_localstack/health" >/dev/null; then
  echo "✗ LocalStack is not reachable at ${ENDPOINT}. Run 'npm run localstack:up' first." >&2
  exit 1
fi

# ----------------------------------------------------------------------------
# S3 — bucket + CORS (browser presigned PUT) + public read on thumbnails
# ----------------------------------------------------------------------------
echo "→ Creating S3 bucket ${BUCKET}..."
awsl s3api create-bucket --bucket "$BUCKET" \
  --create-bucket-configuration LocationConstraint="$REGION" >/dev/null 2>&1 || true

awsl s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3022", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }]
}' >/dev/null

awsl s3api put-bucket-policy --bucket "$BUCKET" --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicThumbnails",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::'"$BUCKET"'/uploads/thumbnail/*"
  }]
}' >/dev/null

# ----------------------------------------------------------------------------
# DynamoDB — tables mirroring the prod CDK stack (see infra/lib/wedding-stack.ts)
# ----------------------------------------------------------------------------
echo "→ Creating DynamoDB table ${ARCHIVE_TABLE}..."
awsl dynamodb create-table --table-name "$ARCHIVE_TABLE" \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 || true

echo "→ Creating DynamoDB table ${PHOTOS_TABLE}..."
awsl dynamodb create-table --table-name "$PHOTOS_TABLE" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=uploaded_at,AttributeType=S \
    AttributeName=invitation_code,AttributeType=S \
    AttributeName=s3_key,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {"IndexName": "byStatus",
     "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"},
                   {"AttributeName": "uploaded_at", "KeyType": "RANGE"}],
     "Projection": {"ProjectionType": "ALL"}},
    {"IndexName": "byCode",
     "KeySchema": [{"AttributeName": "invitation_code", "KeyType": "HASH"},
                   {"AttributeName": "uploaded_at", "KeyType": "RANGE"}],
     "Projection": {"ProjectionType": "KEYS_ONLY"}},
    {"IndexName": "byS3Key",
     "KeySchema": [{"AttributeName": "s3_key", "KeyType": "HASH"}],
     "Projection": {"ProjectionType": "KEYS_ONLY"}}
  ]' >/dev/null 2>&1 || true

echo "→ Creating DynamoDB table ${CATEGORIES_TABLE}..."
awsl dynamodb create-table --table-name "$CATEGORIES_TABLE" \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST >/dev/null 2>&1 || true

# ----------------------------------------------------------------------------
# Seed — one invitation + code, and the photo categories
# ----------------------------------------------------------------------------
echo "→ Seeding invitation code '${SEED_CODE}' + photo categories..."
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

awsl dynamodb put-item --table-name "$ARCHIVE_TABLE" --item '{
  "PK": {"S": "INVITATION#1"}, "SK": {"S": "META"},
  "entity": {"S": "invitation"}, "id": {"N": "1"},
  "is_matthew_side": {"BOOL": true}, "sent": {"BOOL": true},
  "villa_offered": {"BOOL": false}, "created_at": {"S": "'"$NOW"'"}
}' >/dev/null

awsl dynamodb put-item --table-name "$ARCHIVE_TABLE" --item '{
  "PK": {"S": "CODE#'"$SEED_CODE"'"}, "SK": {"S": "META"},
  "entity": {"S": "code"}, "code": {"S": "'"$SEED_CODE"'"},
  "invitation_id": {"N": "1"}, "created_at": {"S": "'"$NOW"'"}
}' >/dev/null

seed_category() { # id name slug sort_order
  awsl dynamodb put-item --table-name "$CATEGORIES_TABLE" --item '{
    "id": {"S": "'"$1"'"}, "name": {"S": "'"$2"'"}, "slug": {"S": "'"$3"'"},
    "description": {"NULL": true}, "event_day": {"NULL": true},
    "cover_photo_id": {"NULL": true}, "sort_order": {"N": "'"$4"'"},
    "created_at": {"S": "'"$NOW"'"}
  }' >/dev/null
}
seed_category "cat-getting-ready"       "Getting Ready"      "getting-ready"       1
seed_category "cat-the-ceremony"        "The Ceremony"       "the-ceremony"        2
seed_category "cat-drinks"              "Drinks"             "drinks"              3
seed_category "cat-reception"           "Reception"          "reception"           4
seed_category "cat-party"               "Party"              "party"               5
seed_category "cat-rebecca-and-matthew" "Rebecca & Matthew"  "rebecca-and-matthew" 6
seed_category "cat-guest-photos"        "Guest Photos"       "guest-photos"        7

# ----------------------------------------------------------------------------
# Cognito — user pool, app client (with secret), confirmed admin user
# ----------------------------------------------------------------------------
echo "→ Creating Cognito user pool + admin user (${ADMIN_EMAIL})..."
POOL_ID="$(awsl cognito-idp create-user-pool --pool-name wedding-local \
  --query 'UserPool.Id' --output text)"

CLIENT_JSON="$(awsl cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" --client-name web --generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --output json)"
CLIENT_ID="$(printf '%s' "$CLIENT_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["UserPoolClient"]["ClientId"])')"
CLIENT_SECRET="$(printf '%s' "$CLIENT_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["UserPoolClient"]["ClientSecret"])')"

awsl cognito-idp admin-create-user --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" --message-action SUPPRESS \
  --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true >/dev/null
awsl cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --permanent >/dev/null

# ----------------------------------------------------------------------------
# Write .env.localstack
# ----------------------------------------------------------------------------
echo "→ Writing ${ENV_FILE}..."
cat > "$ENV_FILE" <<EOF
# Generated by scripts/localstack/bootstrap.sh — do not edit by hand.
# Re-run 'npm run localstack:bootstrap' to regenerate.

PORT=3022
AWS_REGION=${REGION}
AWS_ENDPOINT_URL=${ENDPOINT}

# LocalStack accepts any credentials; "test"/"test" is the convention.
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
LAMBDA_AWS_KEY_ID=test
LAMBDA_AWS_SECRET=test

# S3 / CDN (thumbnails served directly from LocalStack S3, path-style)
S3_PHOTOS_BUCKET=${BUCKET}
NEXT_PUBLIC_CLOUDFRONT_URL=${ENDPOINT}/${BUCKET}

# Bride & groom master code — valid everywhere a guest code is, auto-filled
# for logged-in admins, exempt from upload rate limiting.
MASTER_INVITATION_CODE=LOCAL1

# DynamoDB
DDB_ARCHIVE_TABLE=${ARCHIVE_TABLE}
DDB_PHOTOS_TABLE=${PHOTOS_TABLE}
DDB_CATEGORIES_TABLE=${CATEGORIES_TABLE}

# Cognito (admin auth)
COGNITO_USER_POOL_ID=${POOL_ID}
COGNITO_CLIENT_ID=${CLIENT_ID}
COGNITO_CLIENT_SECRET=${CLIENT_SECRET}
COGNITO_ISSUER=${ISSUER_ENDPOINT}/${POOL_ID}

# Don't throttle uploads locally
DISABLE_RATE_LIMITING=true
EOF

cat <<EOF

✅ LocalStack bootstrapped.

   Admin login:     ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
   Invitation code: ${SEED_CODE}
   Bucket:          ${BUCKET}

Next:
   npm run dev                             # start Next.js against LocalStack
   # upload a photo at /gallery/upload using code ${SEED_CODE}
   npm run localstack:process              # generate thumbnails (emulates the Lambda)
   # approve it in /dashboard/photos, then view it in /gallery
EOF

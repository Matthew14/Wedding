#!/usr/bin/env bash
#
# Provisions all the AWS resources the app needs against a running LocalStack
# instance, applies the database schema, seeds a test invitation code + photo
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
DB="wedding"
CLUSTER_ID="wedding-local"
CLUSTER_ARN="arn:aws:rds:${REGION}:000000000000:cluster:${CLUSTER_ID}"
DB_USER="wedding"
DB_PASS="wedding_local_pw"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@oneill.wedding}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-WeddingLocal123!}"
SEED_CODE="TEST01"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.localstack"
SCHEMA="${ROOT}/infra/sql/schema.sql"

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
# Secrets Manager + RDS cluster (backs the RDS Data API)
# ----------------------------------------------------------------------------
echo "→ Creating DB secret..."
SECRET_STRING="{\"username\":\"${DB_USER}\",\"password\":\"${DB_PASS}\",\"engine\":\"postgres\",\"dbname\":\"${DB}\"}"
SECRET_ARN="$(awsl secretsmanager create-secret --name wedding-local-db \
  --secret-string "$SECRET_STRING" --query ARN --output text 2>/dev/null || \
  awsl secretsmanager describe-secret --secret-id wedding-local-db --query ARN --output text)"

echo "→ Creating RDS cluster ${CLUSTER_ID}..."
awsl rds create-db-cluster \
  --db-cluster-identifier "$CLUSTER_ID" \
  --engine aurora-postgresql \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASS" \
  --database-name "$DB" >/dev/null 2>&1 || true

echo "→ Waiting for RDS Data API to accept queries..."
for i in $(seq 1 30); do
  if awsl rds-data execute-statement --resource-arn "$CLUSTER_ARN" \
      --secret-arn "$SECRET_ARN" --database "$DB" --sql "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  [ "$i" = "30" ] && { echo "✗ RDS Data API never came up" >&2; exit 1; }
done

# ----------------------------------------------------------------------------
# Schema + seed
# ----------------------------------------------------------------------------
run_sql() {
  awsl rds-data execute-statement --resource-arn "$CLUSTER_ARN" \
    --secret-arn "$SECRET_ARN" --database "$DB" --sql "$1" >/dev/null
}

echo "→ Applying schema (infra/sql/schema.sql)..."
# Split the schema file on ';' and run each statement individually — the Data
# API executes one statement per call. (schema.sql is plain DDL, no function
# bodies, so a naive split is safe.)
while IFS= read -r -d '' stmt; do
  [ -z "${stmt//[[:space:]]/}" ] && continue
  run_sql "$stmt"
done < <(awk 'BEGIN{RS=";"} { gsub(/^[[:space:]]+|[[:space:]]+$/,""); if (length($0) > 0) printf "%s%c", $0, 0 }' "$SCHEMA")

echo "→ Seeding invitation code '${SEED_CODE}' + photo categories..."
run_sql "INSERT INTO invitations (id) VALUES (1) ON CONFLICT DO NOTHING"
run_sql "INSERT INTO invitation_codes (code, invitation_id) VALUES ('${SEED_CODE}', 1) ON CONFLICT DO NOTHING"
run_sql "INSERT INTO photo_categories (name, slug, sort_order) VALUES
  ('Getting Ready','getting-ready',1),
  ('The Ceremony','the-ceremony',2),
  ('Drinks','drinks',3),
  ('Reception','reception',4),
  ('Party','party',5),
  ('Rebecca & Matthew','rebecca-and-matthew',6),
  ('Guest Photos','guest-photos',7)
  ON CONFLICT (slug) DO NOTHING"

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

# RDS Data API
DB_NAME=${DB}
AURORA_CLUSTER_ARN=${CLUSTER_ARN}
AURORA_SECRET_ARN=${SECRET_ARN}

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

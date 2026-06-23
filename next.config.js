/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production";

// Only include PostHog in production
const posthogUrls = isProduction ? " https://eu.i.posthog.com https://eu-assets.i.posthog.com" : "";

const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_URL ?? "";
// Use the origin (scheme://host:port), not the full URL. The value may include a
// path (e.g. the bucket path in local LocalStack URLs), and a CSP source with a
// trailing path only matches that exact path — which blocks nested object keys.
const cloudfrontUrl = cloudfrontDomain ? new URL(cloudfrontDomain) : null;
const cloudfrontCsp = cloudfrontUrl ? ` ${cloudfrontUrl.origin}` : "";

const awsRegion = process.env.AWS_REGION ?? "eu-west-1";

// The browser PUTs guest uploads straight to S3 via a presigned URL. Pin
// connect-src to just that bucket endpoint rather than allowing all of
// *.amazonaws.com. Locally we hit the LocalStack endpoint; in prod it's the
// virtual-hosted bucket URL.
const s3Endpoint = process.env.AWS_ENDPOINT_URL ?? "";
const s3Bucket = process.env.S3_PHOTOS_BUCKET ?? "";
const s3Csp = s3Endpoint
    ? ` ${new URL(s3Endpoint).origin}`
    : s3Bucket
        ? ` https://${s3Bucket}.s3.${awsRegion}.amazonaws.com`
        : "";

const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
const cognitoJwks = cognitoUserPoolId
    ? ` https://cognito-idp.${awsRegion}.amazonaws.com`
    : "";

const nextConfig = {
    env: {
        COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? "",
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? "",
        COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET ?? "",
        AURORA_CLUSTER_ARN: process.env.AURORA_CLUSTER_ARN ?? "",
        AURORA_SECRET_ARN: process.env.AURORA_SECRET_ARN ?? "",
        LAMBDA_AWS_KEY_ID: process.env.LAMBDA_AWS_KEY_ID ?? "",
        LAMBDA_AWS_SECRET: process.env.LAMBDA_AWS_SECRET ?? "",
        S3_PHOTOS_BUCKET: process.env.S3_PHOTOS_BUCKET ?? "",
    },
    images: {
        remotePatterns: cloudfrontUrl
            ? [{
                protocol: cloudfrontUrl.protocol.replace(":", ""),
                hostname: cloudfrontUrl.hostname,
                ...(cloudfrontUrl.port && { port: cloudfrontUrl.port }),
            }]
            : [],
    },
    experimental: {
        optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    },
    // standalone only for GitHub CI — Amplify handles SSR natively (sets AWS_APP_ID)
    ...(process.env.CI && !process.env.AWS_APP_ID && {
        output: "standalone",
        trailingSlash: true,
    }),
    async redirects() {
        return [
            { source: '/faqs', destination: '/', permanent: true },
            { source: '/faqs/', destination: '/', permanent: true },
            { source: '/invitation/:path*', destination: '/', permanent: true },
            { source: '/location', destination: '/', permanent: true },
            { source: '/location/', destination: '/', permanent: true },
            { source: '/privacy', destination: '/', permanent: true },
            { source: '/privacy/', destination: '/', permanent: true },
            { source: '/rsvp', destination: '/', permanent: true },
            { source: '/rsvp/', destination: '/', permanent: true },
            { source: '/rsvp/:path*', destination: '/', permanent: true },
            { source: '/schedule', destination: '/', permanent: true },
            { source: '/schedule/', destination: '/', permanent: true },
            { source: '/seat-finder', destination: '/', permanent: true },
            { source: '/seat-finder/', destination: '/', permanent: true },
        ];
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com${posthogUrls}; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com${posthogUrls}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com${cloudfrontCsp}; font-src 'self' data:; connect-src 'self' https://maps.googleapis.com${s3Csp}${posthogUrls}${cloudfrontCsp}${cognitoJwks}; frame-src 'self' https://www.google.com https://maps.googleapis.com;`,
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

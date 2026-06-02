/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production";

// Only include PostHog in production
const posthogUrls = isProduction ? " https://eu.i.posthog.com https://eu-assets.i.posthog.com" : "";

const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_URL ?? "";
const cloudfrontCsp = cloudfrontDomain ? ` ${cloudfrontDomain}` : "";

const awsRegion = process.env.AWS_REGION ?? "eu-west-1";
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
const cognitoJwks = cognitoUserPoolId
    ? ` https://cognito-idp.${awsRegion}.amazonaws.com`
    : "";

const nextConfig = {
    images: {
        remotePatterns: cloudfrontDomain
            ? [{ protocol: "https", hostname: new URL(cloudfrontDomain).hostname }]
            : [],
    },
    experimental: {
        optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    },
    ...(process.env.CI && {
        output: "standalone",
        trailingSlash: true,
    }),
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
                        value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com${posthogUrls}; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com${posthogUrls}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com${cloudfrontCsp}; font-src 'self' data:; connect-src 'self' https://maps.googleapis.com${posthogUrls}${cloudfrontCsp}${cognitoJwks}; frame-src 'self' https://www.google.com https://maps.googleapis.com;`,
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

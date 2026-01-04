/** @type {import('next').NextConfig} */

// Only include localhost Supabase URLs in development/test environments
const isProduction = process.env.NODE_ENV === "production";
const localSupabaseUrls = isProduction
    ? ""
    : " http://127.0.0.1:54321 http://127.0.0.1:54421";

// Only include PostHog in production
const posthogUrls = isProduction ? " https://eu.i.posthog.com https://eu-assets.i.posthog.com" : "";

const nextConfig = {
    images: {
        domains: [""],
        remotePatterns: [],
    },
    serverExternalPackages: ["isomorphic-dompurify"],
    experimental: {
        optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    },
    // Skip static optimization in CI to avoid needing real API keys
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
                        value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://maps.googleapis.com${posthogUrls}; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://maps.googleapis.com${posthogUrls}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co${localSupabaseUrls} https://va.vercel-scripts.com https://maps.googleapis.com${posthogUrls}; frame-src 'self' https://www.google.com https://maps.googleapis.com;`,
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

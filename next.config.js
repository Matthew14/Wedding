/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [""],
        remotePatterns: [],
    },
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
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://maps.googleapis.com; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://maps.googleapis.com; frame-src 'self' https://www.google.com https://maps.googleapis.com;",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

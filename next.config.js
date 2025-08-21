/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [''],
    remotePatterns: [
    ],
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
}

module.exports = nextConfig

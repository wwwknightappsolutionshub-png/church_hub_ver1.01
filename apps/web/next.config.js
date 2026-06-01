/** @type {import('next').NextConfig} */
// Standalone is required for Docker (infra/docker/Dockerfile.web). On Windows without
// Developer Mode, symlink creation fails during `next build` — use `pnpm build:local`.
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@church-hub/shared-types'],
  ...(process.env.NEXT_STANDALONE !== '0' ? { output: 'standalone' } : {}),
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

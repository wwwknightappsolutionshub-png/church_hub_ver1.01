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
  async redirects() {
    return [
      {
        source: '/dashboard/follow-up',
        destination: '/dashboard/establishment',
        permanent: true,
      },
      {
        source: '/dashboard/follow-up/:path*',
        destination: '/dashboard/establishment/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    const authNoStore = [
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ];
    return [
      { source: '/login', headers: authNoStore },
      { source: '/login/magic', headers: authNoStore },
      { source: '/register', headers: authNoStore },
      { source: '/forgot-password', headers: authNoStore },
      { source: '/reset-password', headers: authNoStore },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      {
        source: '/outreach/capture',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ];
  },
};

module.exports = nextConfig;

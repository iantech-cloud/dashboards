import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // The 'mongoose' package needs to be explicitly listed as an external package
  // to be correctly bundled and used within Next.js Server Components.
  serverExternalPackages: ['mongoose'],

  // Example remote image configuration (if needed later)
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: 'https',
  //       hostname: 'example.com',
  //     },
  //   ],
  // },
};

export default nextConfig;


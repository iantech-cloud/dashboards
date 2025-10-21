import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The 'mongoose' package needs to be explicitly listed as an external package
  // to be correctly bundled and used within Next.js Server Components.
  // Moved from experimental to main config
  serverExternalPackages: ['mongoose'],

  // If you plan on hosting any images externally (not just in your public folder),
  // you would also configure those remote domains here.
  // Example:
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

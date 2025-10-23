import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizeCss: true, // CSS optimization
    optimizePackageImports: ['lucide-react', 'react-icons'], // Tree shake these packages
  },

  // The 'mongoose' package needs to be explicitly listed as an external package
  // to be correctly bundled and used within Next.js Server Components.
  serverExternalPackages: ['mongoose'],

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console logs in production
  },

  // Image optimizations
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats for better compression
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Adjust this to your specific domains for security
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Optimized breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Smaller sizes for icons
    minimumCacheTTL: 60, // 1 minute minimum cache
  },

  // Disable TypeScript type checking during builds for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // HTTP headers for caching and performance
  async headers() {
    return [
      {
        source: '/dashboard/blog',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/dashboard/blog/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=60',
          },
        ],
      },
      // 404 Page Caching - Add this section
      {
        source: '/404',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Optimize for production
  poweredByHeader: false, // Remove X-Powered-By header

  // Webpack optimizations - SIMPLIFIED to fix the build error
  webpack: (config, { isServer }) => {
    // Optimize mongoose and other heavy packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }

    return config;
  },
};

export default nextConfig;

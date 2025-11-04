import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Server external packages
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'bcryptjs',
    'speakeasy',
    'nodemailer',
    '@auth/mongodb-adapter',
  ],

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimizations
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // ✅ Disable type checking during build
  typescript: {
    ignoreBuildErrors: true, // Skip "Checking validity of types"
  },

  // ✅ Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
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

  // Security headers
  poweredByHeader: false,

  // Webpack configuration to handle MongoDB and Node.js modules
  webpack: (config, { isServer }) => {
    // Client-side configuration - prevent Node.js modules from being bundled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        crypto: false,
        tls: false,
        net: false,
        dns: false,
        child_process: false,
        http2: false,
        perf_hooks: false,
      };
    }

    // Server-side configuration - externalize problematic dependencies
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        {
          kerberos: 'commonjs kerberos',
          '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
          snappy: 'commonjs snappy',
          aws4: 'commonjs aws4',
          'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
          '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
        },
      ];
    }

    return config;
  },
};

export default nextConfig;


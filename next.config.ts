import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'bcryptjs',
    'speakeasy',
    'nodemailer',
    '@auth/mongodb-adapter',
  ],

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=10, stale-while-revalidate=60' }],
      },
    ];
  },

  webpack: (config, { isServer }) => {
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


import type { Metadata } from 'next';
import HomePageClient from './home-client';

// Export metadata from this server component
export const metadata: Metadata = {
  title: 'Hustle Hub Africa - Earn Money Online in Kenya',
  description: 'Discover multiple ways to make money online in Kenya with Hustle Hub Africa. Join our referral program, complete paid surveys, academic writing jobs, and more. Instant M-Pesa withdrawals. Start earning today!',
  
  keywords: [
    'earn money online in kenya',
    'make money online kenya',
    'online jobs in kenya',
    'work from home kenya',
    'how to make money online kenya',
    'ways to make money in kenya',
    'earn money online kenya',
    'ways of making money in kenya',
    'paid surveys kenya',
    'academic writing jobs kenya',
    'referral program kenya',
    'earn for life referral program',
    'm-pesa withdrawals',
    'hustle hub africa',
  ],
  
  // Canonical URL - Next.js will automatically combine metadataBase + this path
  alternates: {
    canonical: '/',
    languages: {
      'en-KE': '/',
    },
  },
  
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://hustlehubafrica.com',
    siteName: 'Hustle Hub Africa',
    title: 'Hustle Hub Africa - Earn Money Online in Kenya',
    description: 'Join Kenyans earning through our platform. Multiple income streams including referral program, surveys, academic writing & more. Instant M-Pesa withdrawals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hustle Hub Africa - Earn Money Online in Kenya',
        type: 'image/png',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@HustleHubAfrica',
    creator: '@HustleHubAfrica',
    title: 'Hustle Hub Africa - Earn Money Online in Kenya',
    description: 'Join Kenyans earning through surveys, writing, referrals & more. Instant M-Pesa withdrawals.',
    images: ['/og-image.png'],
  },
};

// Import and render your client component
export default function Page() {
  return <HomePageClient />;
}

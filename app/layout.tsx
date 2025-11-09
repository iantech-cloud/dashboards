import React from 'react';
import './ui/global.css';
import { timesNewRoman } from './ui/fonts';
import type { Metadata, Viewport } from 'next';
import { DashboardProvider } from './dashboard/DashboardContext';
import SessionProvider from './providers/SessionProvider';
import Script from 'next/script';
import { auth } from '@/auth';
import { Analytics } from "@vercel/analytics/next"

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://hustlehubafrica.com'),
  title: {
    template: '%s | Hustle Hub Africa',
    default: 'Hustle Hub Africa - Earn Money Online in Kenya',
  },
  description: 'Discover multiple ways to make money online in Kenya with Hustle Hub Africa. Join our referral program, complete paid surveys, academic writing jobs, and more. Instant M-Pesa withdrawals. Start earning today!',
  keywords: [
    'earn money online in kenya',
    'make money online kenya',
    'online jobs in kenya',
    'work from home kenya',
    'freelance jobs kenya',
    'paid surveys kenya',
    'academic writing jobs kenya',
    'referral program kenya',
    'm-pesa withdrawals',
    'content writing jobs kenya',
    'airtime reselling kenya',
    'hustle hub africa',
    'kenya online jobs'
  ],
  authors: [{ name: 'Hustle Hub Africa Team' }],
  creator: 'Hustle Hub Africa',
  publisher: 'Hustle Hub Africa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/icon.png',
        type: 'image/png',
        sizes: '32x32',
      },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  manifest: '/site.webmanifest',
  
  // Open Graph Meta Tags
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
  
  // Twitter Card Meta Tags
  twitter: {
    card: 'summary_large_image',
    site: '@HustleHubAfrica',
    creator: '@HustleHubAfrica',
    title: 'Hustle Hub Africa - Earn Money Online',
    description: 'Join Kenyans earning through surveys, writing, referrals & more. Instant M-Pesa withdrawals.',
    images: ['/og-image.png'],
  },
  
  // Additional Meta Tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification Tags
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  
  // Category
  category: 'Business',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4F46E5' },
    { media: '(prefers-color-scheme: dark)', color: '#312E81' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session server-side
  const session = await auth();
  
  console.log('RootLayout - Server session:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    email: session?.user?.email
  });

  const contextValue = {
    user: null,
  };

  // Structured Data - Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hustle Hub Africa',
    url: 'https://hustlehubafrica.com',
    logo: 'https://hustlehubafrica.com/logo.png',
    description: 'Leading platform for earning money online in Kenya through multiple income streams',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+254-748-264-231',
      contactType: 'Customer Service',
      areaServed: 'KE',
      availableLanguage: ['English', 'Swahili'],
    },
    sameAs: [
      'https://www.facebook.com/HustleHubAfrica',
      'https://twitter.com/HustleHubAfrica',
      'https://www.instagram.com/hustlehubafrica',
    ],
  };

  // Structured Data - Website Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hustle Hub Africa',
    url: 'https://hustlehubafrica.com',
    description: 'Earn money online in Kenya through multiple income streams',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://hustlehubafrica.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Structured Data - Service Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Online Income Platform',
    provider: {
      '@type': 'Organization',
      name: 'Hustle Hub Africa',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Kenya',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Ways to Earn',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Referral Program',
            description: 'Referral program with recurring commissions',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Paid Surveys',
            description: 'Complete research surveys and earn money',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Academic Writing',
            description: 'Write academic papers and essays',
          },
        },
      ],
    },
  };

  // Structured Data - FAQPage Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How can I make money online in Kenya?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can make money online in Kenya through Hustle Hub Africa by completing paid surveys, academic writing, content writing, airtime reselling, and participating in our referral program.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the referral program?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our referral program allows you to earn commissions from your referrals activities and build passive income streams.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I withdraw my earnings?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Withdrawals are instant via M-Pesa. Request a withdrawal and receive your money within minutes.',
        },
      },
    ],
  };

  return (
    <html lang="en" className={timesNewRoman.variable}>
      <head>
        {/* Structured Data - JSON-LD */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <Script
          id="service-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(serviceSchema),
          }}
        />
        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
        />

        {/* MathJax Configuration */}
        <Script
          id="mathjax-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.MathJax = {
                tex: {
                  inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                  displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                  processEscapes: true,
                  processEnvironments: true,
                },
                svg: {
                  fontCache: 'global',
                  scale: 1.2,
                },
                startup: {
                  pageReady: () => {
                    return Promise.resolve();
                  },
                },
                options: {
                  ignoreHtmlClass: 'tex2jax_ignore',
                  processHtmlClass: 'tex2jax_process',
                  enableMenu: false,
                },
              };
            `,
          }}
        />
        
        {/* MathJax Library */}
        <Script
          id="mathjax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />

        {/* Preconnect to External Domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        
        {/* DNS Prefetch for Performance */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className={`${timesNewRoman.className} antialiased`}>
        {/* Pass the session to SessionProvider */}
        <SessionProvider session={session}>
          <DashboardProvider value={contextValue}>
            {children}
          </DashboardProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

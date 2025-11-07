import React from 'react';
import './ui/global.css';
import { timesNewRoman } from './ui/fonts';
import type { Metadata, Viewport } from 'next';
import { DashboardProvider } from './dashboard/DashboardContext';
import SessionProvider from './providers/SessionProvider';
import Script from 'next/script';
import { auth } from '@/auth';

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://hustlehubafrica.com'),
  title: {
    template: '%s | Hustle Hub Africa - Earn Money Online in Kenya',
    default: 'HustleHub Africa - Ways to Make Money Online in Kenya | Earn for Life Referral Program',
  },
  description: 'Discover multiple ways to make money online in Kenya with HustleHub Africa. Join our earn for life referral program, complete paid surveys, academic writing jobs, and more. Easy way to make money online in Kenya with instant M-Pesa withdrawals. Start earning today!',
  keywords: [
    'earn for life referral program',
    'earn money online in kenya',
    'easy way to make money online in kenya',
    'how can i make money online in kenya',
    'how to make money online kenya',
    'hustle hub',
    'hustlehub',
    'make money online kenya',
    'ways of making money in kenya',
    'ways to make money in kenya',
    'ways to make money online in kenya',
    'online jobs in kenya',
    'work from home kenya',
    'freelance jobs kenya',
    'paid surveys kenya',
    'academic writing jobs kenya',
    'm-pesa withdrawals',
    'content writing jobs kenya',
    'airtime reselling kenya'
  ],
  authors: [{ name: 'HustleHub Africa Team' }],
  creator: 'HustleHub Africa',
  publisher: 'HustleHub Africa',
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
    siteName: 'HustleHub Africa',
    title: 'HustleHub Africa - Ways to Make Money Online in Kenya',
    description: 'Join 10,000+ Kenyans earning through our platform. Multiple income streams including referral program, surveys, academic writing & more. Instant M-Pesa withdrawals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HustleHub Africa - Earn Money Online in Kenya',
        type: 'image/png',
      },
      {
        url: '/hero-desktop.png',
        width: 1000,
        height: 760,
        alt: 'HustleHub Africa Dashboard',
      },
    ],
  },
  
  // Twitter Card Meta Tags
  twitter: {
    card: 'summary_large_image',
    site: '@HustleHubAfrica',
    creator: '@HustleHubAfrica',
    title: 'HustleHub Africa - Ways to Make Money Online in Kenya',
    description: 'Join 10,000+ Kenyans earning through surveys, writing, referrals & more. Instant M-Pesa withdrawals. Start earning today!',
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
    // Add other verification codes as needed
  },
  
  // Alternate Languages (if applicable)
  alternates: {
    canonical: 'https://hustlehubafrica.com',
    languages: {
      'en-KE': 'https://hustlehubafrica.com',
      'sw-KE': 'https://hustlehubafrica.com/sw',
    },
  },
  
  // Category
  category: 'Business',
  
  // Additional metadata
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'HustleHub',
  },
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
    name: 'HustleHub Africa',
    alternateName: 'Hustle Hub',
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
      'https://www.linkedin.com/company/hustlehubafrica',
      'https://www.instagram.com/hustlehubafrica',
    ],
  };

  // Structured Data - Website Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HustleHub Africa',
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
      name: 'HustleHub Africa',
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
            description: 'Earn for life referral program with recurring commissions',
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
            description: 'Write academic papers and essays for students',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Content Writing',
            description: 'Create blog posts and articles for businesses',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Airtime Reselling',
            description: 'Become an airtime vendor and earn profit margins',
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
          text: 'You can make money online in Kenya through HustleHub Africa by completing paid surveys, academic writing, content writing, airtime reselling, participating in our referral program, and more. We offer 9 different income streams on one platform.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the earn for life referral program?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our earn for life referral program allows you to earn recurring commissions from your referrals activities. Unlike one-time bonuses, you build a sustainable passive income stream by referring friends and family to HustleHub Africa.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I withdraw my earnings?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Withdrawals are instant via M-Pesa. Request a withdrawal anytime and receive your money within minutes directly to your M-Pesa account.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the registration fee?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'There is a one-time registration fee of Ksh 1000 to join HustleHub Africa. This gives you lifetime access to all earning methods on the platform.',
        },
      },
    ],
  };

  // Structured Data - BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://hustlehubafrica.com',
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
        <Script
          id="breadcrumb-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
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

        {/* Preconnect to External Domains (Performance Optimization) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        
        {/* DNS Prefetch for Performance */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://hustlehubafrica.com" />
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

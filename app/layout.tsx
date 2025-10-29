// app/layout.tsx - FIXED VERSION
import React from 'react';
import './ui/global.css';
import { timesNewRoman } from './ui/fonts';
import type { Metadata, Viewport } from 'next';
import { DashboardProvider } from './dashboard/DashboardContext';
import SessionProvider from './providers/SessionProvider';
import Script from 'next/script';
import { auth } from '@/auth'; // IMPORTANT: Import the auth function

export const metadata: Metadata = {
  title: {
    template: '%s | Hustle Hub Africa',
    default: 'Hustle Hub Africa - Your Gateway to Digital Earning',
  },
  description: 'Explore diverse opportunities to earn income, build skills, and achieve financial freedom with Hustle Hub Africa.',
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ // IMPORTANT: Make this async
  children,
}: {
  children: React.ReactNode;
}) {
  // CRITICAL: Fetch session server-side
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

  return (
    <html lang="en" className={timesNewRoman.variable}>
      <head>
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
      </head>
      <body className={`${timesNewRoman.className} antialiased`}>
        {/* IMPORTANT: Pass the session to SessionProvider */}
        <SessionProvider session={session}>
          <DashboardProvider value={contextValue}>
            {children}
          </DashboardProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

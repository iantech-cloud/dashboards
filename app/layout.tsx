// app/layout.tsx
import React from 'react';
import './ui/global.css';
import { timesNewRoman } from './ui/fonts';
import type { Metadata, Viewport } from 'next';
import { DashboardProvider } from './dashboard/DashboardContext';
import { UserProvider } from '../components/UserProvider'; // Import from components

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contextValue = {
    user: null,
  };

  return (
    <html lang="en" className={timesNewRoman.variable}>
      <body className={`${timesNewRoman.className} antialiased`}>
        <DashboardProvider value={contextValue}>
          <UserProvider /> {/* Add this line */}
          {children}
        </DashboardProvider>
      </body>
    </html>
  );
}

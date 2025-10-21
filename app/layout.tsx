// app/layout.tsx
import React from 'react';
import './ui/global.css';
import { inter } from './ui/fonts';
import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile } from './lib/models';
import { DashboardProvider } from './dashboard/DashboardContext';

export const metadata: Metadata = {
  title: {
    template: '%s | Hustle Hub Africa',
    default: 'Hustle Hub Africa - Your Gateway to Digital Earning',
  },
  description: 'Explore diverse opportunities to earn income, build skills, and achieve financial freedom with Hustle Hub Africa.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

async function getAuthenticatedUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email }).lean();

    if (!user) {
      return null;
    }

    const transformedUser = {
      id: user._id.toString(),
      name: user.username,
      email: user.email,
      phone: user.phone_number,
      balance: user.balance_cents / 100,
      referralCode: user.referral_id,
      totalEarnings: user.total_earnings_cents / 100,
      tasksCompleted: user.tasks_completed,
      isVerified: user.is_verified,
      isActive: user.is_active,
      isApproved: user.is_approved,
      role: user.role,
      status: user.status,
      banReason: user.ban_reason,
      bannedAt: user.banned_at?.toISOString(),
      suspensionReason: user.suspension_reason,
      suspendedAt: user.suspended_at?.toISOString(),
      level: user.level,
      rank: user.rank,
      availableSpins: user.available_spins,
      lastWithdrawalDate: undefined,
    };

    return transformedUser;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  const contextValue = {
    user: user,
    // apiFetch is now provided by the server action in DashboardContext
  };

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <DashboardProvider value={contextValue}>
          {children}
        </DashboardProvider>
      </body>
    </html>
  );
}

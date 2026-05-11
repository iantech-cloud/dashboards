// app/auth/login/page.tsx - UPDATED WITH METADATA
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginContent from './LoginContent';
import type { Metadata } from 'next';

// SEO Metadata for Login Page
export const metadata: Metadata = {
  title: 'Login to Your Account',
  description: 'Sign in to your Hustle Hub Africa account to access paid surveys, writing jobs, referral programs, and multiple ways to earn money online in Kenya.',
  keywords: [
    'login hustle hub africa',
    'sign in kenya online jobs',
    'account access kenya',
    'earn money online login',
    'kenya freelance platform login',
    'mpesa withdrawals login'
  ],
  robots: {
    index: false, // Don't index login pages for SEO
    follow: false,
  },
  openGraph: {
    title: 'Login | Hustle Hub Africa',
    description: 'Sign in to your account and start earning money online in Kenya through surveys, writing jobs, and referrals.',
    url: '/auth/login',
    type: 'website',
  },
  twitter: {
    title: 'Login | Hustle Hub Africa',
    description: 'Sign in to your account and start earning money online in Kenya.',
  },
  alternates: {
    canonical: 'https://hustlehubafrica.com/auth/login',
  },
};

function getDashboardRoute(role: string): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'support':
      return '/support';
    default:
      return '/dashboard';
  }
}

async function LoginPageInner() {
  const session = await auth();

  // If user is already logged in, check if they have incomplete status
  if (session && session.user) {
    const user = session.user;
    const authMethod = user.authMethod || 'credentials';

    console.log('User already logged in, checking status:', {
      email: user.email,
      authMethod,
      is_verified: user.is_verified,
      profile_completed: user.profile_completed,
      isActivationPaid: user.isActivationPaid,
      is_approved: user.is_approved,
      approval_status: user.approval_status,
      is_active: user.is_active,
      status: user.status,
    });

    // ONLY redirect if user has incomplete status that needs attention
    // Don't redirect just because they're logged in

    // Check if email is not verified - BUT skip for Google OAuth users
    // Google users have verified emails by default
    if (!user.is_verified && authMethod !== 'google') {
      console.log('Credentials user - Email not verified, redirecting to verify-email');
      redirect('/auth/verify-email');
    }

    // For Google OAuth Users - check for incomplete profile
    if (authMethod === 'google' && !user.profile_completed) {
      console.log('OAuth user - Profile not completed, redirecting to complete-profile');
      redirect('/auth/complete-profile');
    }

    // Check activation payment for both user types
    // Store email in URL so activation page can access it
    if (!user.isActivationPaid && !user.activation_paid_at) {
      console.log('User - Activation not paid, redirecting to activate with email:', user.email);
      // Encode email in URL as fallback since sessionStorage won't work in server redirect
      const activateUrl = `/auth/activate?email=${encodeURIComponent(user.email)}`;
      redirect(activateUrl);
    }

    // Check if not approved
    if (!user.is_approved || user.approval_status === 'pending') {
      console.log('User - Not approved, redirecting to pending-approval');
      redirect('/auth/pending-approval');
    }

    // Check if not active
    if (!user.is_active || user.status !== 'active') {
      console.log('User - Not active, redirecting to pending-approval');
      redirect('/auth/pending-approval');
    }

    // If user is fully verified, approved, and active, we DON'T automatically redirect
    // This allows users to manually choose to go to login page even when logged in
    console.log('User is fully authenticated but staying on login page by choice');
    
    // We'll show a message in the LoginContent component instead of redirecting
    // This gives users the choice to stay on login or go to dashboard
  }

  // Always show the login form, even if user is logged in
  // This allows users to:
  // 1. Login with a different account
  // 2. See the login page even when already logged in
  // 3. Manually choose to go to their dashboard
  return <LoginContent hasExistingSession={!!session} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load the login page.</p>
          </div>
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

// app/auth/sign-up/page.tsx - UPDATED WITH METADATA
import { Suspense } from 'react';
import SignUpContent from './SignUpContent';
import type { Metadata } from 'next';

// SEO Metadata for Sign Up Page
export const metadata: Metadata = {
  title: 'Create Your Account',
  description: 'Join Hustle Hub Africa and start earning money online in Kenya. Sign up for paid surveys, academic writing jobs, referral programs, and multiple income streams with instant M-Pesa withdrawals.',
  keywords: [
    'sign up hustle hub africa',
    'register online jobs kenya',
    'create account earn money kenya',
    'kenya freelance platform signup',
    'join paid surveys kenya',
    'academic writing registration kenya',
    'referral program sign up kenya',
    'mpesa withdrawals registration'
  ],
  robots: {
    index: false, // Don't index signup pages for SEO
    follow: false,
  },
  openGraph: {
    title: 'Sign Up | Hustle Hub Africa',
    description: 'Join thousands of Kenyans earning online. Create your free account and access multiple income streams including surveys, writing jobs, and referral programs.',
    url: '/auth/sign-up',
    type: 'website',
  },
  twitter: {
    title: 'Sign Up | Hustle Hub Africa',
    description: 'Start your earning journey today. Join Hustle Hub Africa and access various online money-making opportunities in Kenya.',
  },
  alternates: {
    canonical: 'https://hustlehubafrica.com/auth/sign-up',
  },
};

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-indigo-600 mb-4">
              HH HustleHub Africa
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800">Loading...</h2>
            <p className="text-gray-600 mt-2">Preparing registration form...</p>
          </div>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}

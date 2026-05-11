// app/auth/confirm/ConfirmContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus('missing');
        setMessage('No verification token provided. Please check your email for the correct verification link.');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          const email = data.user?.email || '';
          setUserEmail(email);

          // Store the verified email in sessionStorage so the activation page
          // can read it without requiring a login session.
          if (email) {
            sessionStorage.setItem('activation_email', email);
          }

          setStatus('success');
          setMessage('Email verified! Redirecting to account activation...');

          // Go directly to the activation page — no login required
          setTimeout(() => {
            router.push('/auth/activate');
          }, 2500);
        } else {
          setStatus('error');
          setMessage(data.message || data.error || 'Verification failed. Please try again.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error occurred during verification. Please check your connection and try again.');
      }
    }

    verifyEmail();
  }, [token, router]);

  const handleResendEmail = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await response.json();
      setMessage(response.ok ? 'Verification email sent! Please check your inbox.' : (data.message || 'Failed to resend verification email.'));
    } catch {
      setMessage('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">{message}</p>

              {userEmail && (
                <p className="text-sm text-gray-500 mb-4">
                  Verified: <span className="font-medium">{userEmail}</span>
                </p>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4 text-left">
                <p className="text-sm font-semibold text-blue-800 mb-2">What happens next:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>You will be taken to the Account Activation page</li>
                  <li>Enter your M-Pesa number and pay KSH 1,000</li>
                  <li>Wait for admin approval</li>
                  <li>Log in and start earning</li>
                </ol>
              </div>

              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 mb-4">Taking you to activation...</p>

              <Link
                href="/auth/activate"
                className="inline-block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Go to Activation Now
              </Link>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>

              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-left">
                <p className="text-sm text-red-700">This could be because:</p>
                <ul className="text-sm text-red-600 mt-1 space-y-1">
                  <li>The verification link has expired</li>
                  <li>The link has already been used</li>
                  <li>The link is invalid</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResendEmail}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Resend Verification Email
                </button>
                <Link href="/auth/sign-up" className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Create New Account
                </Link>
                <Link href="/auth/login" className="block w-full py-2 px-4 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                  Back to Login
                </Link>
              </div>
            </>
          )}

          {/* Missing token */}
          {status === 'missing' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Verification Link</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="space-y-3">
                <Link href="/auth/sign-up" className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                  Create New Account
                </Link>
                <Link href="/auth/login" className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        {(status === 'error' || status === 'missing') && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Need help?{' '}
              <Link href="/support" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Contact our support team
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

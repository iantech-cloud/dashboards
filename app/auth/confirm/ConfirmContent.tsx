// app/auth/confirm/ConfirmContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sendInitialPaymentInvoice } from '@/app/actions/email';

export default function ConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing' | 'processing'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
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
        console.log('Verifying email with token:', token);
        
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('processing');
          setMessage('Email verified successfully! Setting up your account...');
          setUserEmail(data.user?.email || '');
          setUserName(data.user?.name || data.user?.username || '');
          
          console.log('Email verification successful for:', data.user?.email);
          
          // Send initial payment invoice then redirect to LOGIN (not activate directly)
          // The user must log in first; verify-login will redirect to /auth/activate
          await handleSendInitialInvoice(data.user);
          
        } else {
          setStatus('error');
          setMessage(data.message || data.error || 'Verification failed. Please try again.');
          console.error('Email verification failed:', data);
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('Network error occurred during verification. Please check your connection and try again.');
      }
    }

    async function handleSendInitialInvoice(user: any) {
      try {
        console.log('Sending initial payment invoice for user:', user?.email);
        
        // Generate invoice data - Updated amount to Ksh 1000
        const invoiceData = {
          invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount: 1000, // Updated to Ksh 1000 activation fee
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 7 days from now
          paymentLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/activate`,
          user: {
            name: user?.name || user?.username || 'User',
            email: user?.email || ''
          },
          business: {
            name: 'HustleHub Africa',
            address: 'Nairobi, Kenya',
            phone: '+254 748 264 231',
            email: 'support@hustlehub.africa'
          }
        };

        // Send initial payment invoice
        const result = await sendInitialPaymentInvoice(
          user?.email,
          user?.name || user?.username || 'User',
          {
            invoiceNumber: invoiceData.invoiceNumber,
            amount: invoiceData.amount,
            dueDate: invoiceData.dueDate,
            paymentLink: invoiceData.paymentLink
          }
        );

        if (result.success) {
          console.log('✅ Initial payment invoice sent successfully');
          setStatus('success');
          setMessage('Email verified! Payment invoice has been sent to your email. Please log in to continue to account activation.');
          
          // Redirect to login — verify-login will route them to /auth/activate automatically
          setTimeout(() => {
            router.push('/auth/login?verified=true');
          }, 3000);
        } else {
          console.error('❌ Failed to send initial payment invoice:', result.error);
          // Still redirect to login even if invoice email fails
          setStatus('success');
          setMessage('Email verified! Please log in to continue to account activation.');
          setTimeout(() => {
            router.push('/auth/login?verified=true');
          }, 3000);
        }

      } catch (error) {
        console.error('❌ Error sending initial payment invoice:', error);
        // Still redirect to login even if invoice email fails
        setStatus('success');
        setMessage('Email verified! Please log in to continue to account activation.');
        setTimeout(() => {
          router.push('/auth/login?verified=true');
        }, 3000);
      }
    }

    verifyEmail();
  }, [token, router]);

  const handleResendEmail = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.message || 'Failed to resend verification email.');
      }
    } catch (error) {
      setMessage('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </>
          )}

          {/* Processing State - After verification, before sending invoice */}
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4">
                <p className="text-sm text-blue-700">
                  🎉 Your email has been verified! We're now sending your payment invoice...
                </p>
              </div>
              <p className="text-sm text-gray-500">Preparing your account activation...</p>
            </>
          )}

          {/* Success State - After invoice sent */}
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
                <p className="text-sm text-gray-500 mb-2">
                  Verified email: <span className="font-medium">{userEmail}</span>
                </p>
              )}
              
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-4">
                <p className="text-sm text-green-700 mb-2">
                  Your email has been verified and an activation invoice has been sent!
                </p>
                <p className="text-sm text-green-600">
                  Log in below to continue to the Account Activation page where you will pay the KSH 1,000 activation fee.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-700 font-medium mb-1">Next Steps:</p>
                  <ol className="text-sm text-blue-600 text-left space-y-1 list-decimal list-inside">
                    <li>Log in with your credentials</li>
                    <li>You will be taken to the Account Activation page</li>
                    <li>Pay KSH 1,000 via M-Pesa to activate your account</li>
                    <li>Wait for admin approval, then start earning</li>
                  </ol>
                </div>

                <p className="text-sm text-gray-500">Redirecting to login in a moment...</p>
                
                <Link
                  href="/auth/login?verified=true"
                  className="inline-block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Log In to Continue
                </Link>
              </div>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-sm text-red-700">
                  This could be because:
                </p>
                <ul className="text-sm text-red-600 mt-1 space-y-1 text-left">
                  <li>• The verification link has expired</li>
                  <li>• The link has already been used</li>
                  <li>• The link is invalid</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResendEmail}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Resend Verification Email
                </button>
                <Link
                  href="/auth/sign-up"
                  className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Create New Account
                </Link>
                <Link
                  href="/auth/login"
                  className="block w-full py-2 px-4 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}

          {/* Missing Token State */}
          {status === 'missing' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Verification Link</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 mb-4">
                <p className="text-sm text-yellow-700">
                  Please make sure you're using the exact link from your verification email.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/auth/sign-up"
                  className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Create New Account
                </Link>
                <Link
                  href="/auth/login"
                  className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back to Login
                </Link>
                <Link
                  href="/support"
                  className="block w-full py-2 px-4 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                >
                  Contact Support
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Help Section */}
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

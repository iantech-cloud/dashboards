// app/auth/verify-request/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export default function VerifyRequestPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            HustleHub Africa
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Check Your Email
          </h2>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            We've sent a magic link to{' '}
            <span className="font-semibold text-indigo-600">{email}</span>
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">
              What to do next:
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 text-xs font-bold">
                  1
                </span>
                <span>Check your email inbox for a message from HustleHub Africa</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 text-xs font-bold">
                  2
                </span>
                <span>Click the "Sign In" button in the email</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-2 text-xs font-bold">
                  3
                </span>
                <span>You'll be automatically signed in to your account</span>
              </li>
            </ol>
          </div>

          {/* Security Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">
                  Security Notice
                </p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• The link expires in 24 hours</li>
                  <li>• The link can only be used once</li>
                  <li>• Don't share this link with anyone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Didn't receive the email?
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                • Check your spam or junk folder<br />
                • Make sure you entered the correct email<br />
                • Wait a few minutes and check again
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Link 
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-indigo-600 rounded-lg text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
            
            <p className="text-center text-xs text-gray-500">
              Need help?{' '}
              <Link href="/support" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            For security reasons, the magic link will only work once and expires after 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

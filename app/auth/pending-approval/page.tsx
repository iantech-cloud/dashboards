// app/auth/pending-approval/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PendingApprovalPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkApprovalStatus() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          // If user is approved and active, redirect to dashboard
          if (userData.is_approved && userData.is_active && userData.status === 'active') {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
      }
    }

    checkApprovalStatus();

    // Poll for approval status every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Account Under Review</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            Your account is currently being reviewed by our admin team.
          </p>
          <p className="text-blue-700 text-sm mt-2">
            This process usually takes 24-48 hours. You'll receive an email notification once your account is approved.
          </p>
        </div>

        <div className="space-y-3 text-left bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              user?.is_verified ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className={user?.is_verified ? 'text-green-600' : 'text-gray-500'}>
              Email Verified
            </span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              user?.is_active ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className={user?.is_active ? 'text-green-600' : 'text-gray-500'}>
              Account Activated
            </span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              user?.is_approved ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className={user?.is_approved ? 'text-green-600' : 'text-yellow-600'}>
              Admin Approval {user?.is_approved ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>While you wait, you can:</p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700">
              Check Status
            </Link>
            <Link href="/contact" className="text-indigo-600 hover:text-indigo-700">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

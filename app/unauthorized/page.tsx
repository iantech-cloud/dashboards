// app/unauthorized/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Access Denied
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-2">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          This area is restricted to administrators only.
        </p>

        {/* User Info */}
        {session?.user && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-1">Signed in as:</p>
            <p className="font-semibold text-gray-900">{session.user.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Role: <span className="font-medium">{session.user.role}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-6">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}

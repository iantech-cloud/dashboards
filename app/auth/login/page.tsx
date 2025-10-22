// app/auth/login/page.tsx
import { Suspense } from 'react';
import LoginContent from './LoginContent';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load the login page.</p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

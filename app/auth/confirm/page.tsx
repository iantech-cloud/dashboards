// app/auth/confirm/page.tsx
import { Suspense } from 'react';
import ConfirmContent from './ConfirmContent';

export default function EmailConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load the verification page.</p>
          </div>
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

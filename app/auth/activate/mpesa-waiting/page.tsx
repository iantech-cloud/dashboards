// app/auth/activate/mpesa-waiting/page.tsx
import { Suspense } from 'react';
import MpesaWaitingContent from './MpesaWaitingContent';

export default function ActivationMpesaWaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <h1 className="text-2xl font-bold text-blue-600 mt-6 mb-3">Loading Payment Page</h1>
            <p className="text-gray-700 mb-6">Please wait while we load the payment status...</p>
          </div>
        </div>
      </div>
    }>
      <MpesaWaitingContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import SignUpContent from './SignUpContent';

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

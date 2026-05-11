// app/auth/complete-profile/page.tsx
// This page allows OAuth users to add their phone number

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user needs to complete profile
    if (status === 'authenticated' && session?.user) {
      // If user already has phone number, redirect to dashboard
      if (session.user.phone_number && session.user.profile_completed) {
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePhone(phone)) {
      setError('Please enter a valid 9-digit phone number');
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = `+254${phone.replace(/\s/g, '')}`;

      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update the session with new data
      await update({
        ...session,
        user: {
          ...session?.user,
          phone_number: formattedPhone,
          profile_completed: true,
        },
      });

      // Redirect to dashboard or activation page
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Profile completion error:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhone(value);
    setError('');
  };

  if (isChecking || status === 'loading') {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
        
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-indigo-600 mb-4">
            HH HustleHub Africa
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 mb-4">
            <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Add your M-Pesa number to receive payments
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Why do we need your phone number?</p>
              <ul className="space-y-1 text-xs">
                <li>• Receive payments via M-Pesa</li>
                <li>• Verify your identity</li>
                <li>• Secure your account</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm font-medium" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              M-Pesa Phone Number *
            </label>
            <div className="flex rounded-xl shadow-sm">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-xl">
                +254
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                placeholder="712345678"
                pattern="[0-9]{9}"
                maxLength={9}
                className="flex-1 block w-full px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Enter your 9-digit M-Pesa number without +254
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-200 
                ${isLoading 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-[1.01]'
                }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Next Steps:</h3>
          <ol className="space-y-2 text-xs text-green-700">
            <li className="flex items-start">
              <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</span>
              <span>Add your phone number</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</span>
              <span>Pay KES 100 activation fee</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</span>
              <span>Wait for admin approval</span>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">4</span>
              <span>Start earning!</span>
            </li>
          </ol>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Need help? 
          <Link href="/support" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

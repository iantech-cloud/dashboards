'use client'; 

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpContent() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralId: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); 
    setSuccess('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (!formData.username || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    // Username validation (alphanumeric, underscores, hyphens)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens.');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    // Phone validation (Kenyan format - 9 digits)
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid Kenyan phone number (9 digits without +254).');
      return false;
    }
    // Referral ID validation (if provided)
    if (formData.referralId && !/^[A-Z0-9]{1,10}$/.test(formData.referralId)) {
      setError('Referral ID must be 1-10 characters long and contain only uppercase letters and numbers.');
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting sign up with:', formData);

      // Format phone number to include country code for storage
      const formattedPhone = `+254${formData.phone.replace(/\s/g, '')}`;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          phone: formattedPhone,
          password: formData.password,
          referralId: formData.referralId ? formData.referralId.toUpperCase() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          if (data.message.includes('Username')) {
            throw new Error('Username already taken. Please choose a different username.');
          } else if (data.message.includes('Email')) {
            throw new Error('Email already registered. Please log in or use a different email.');
          }
        } else if (response.status === 400 && data.message.includes('Referral ID')) {
          throw new Error('Invalid referral ID. Please check and try again.');
        }
        throw new Error(data.message || 'Registration failed');
      }

      // Store registration data and show success message
      setRegistrationData(data);
      setEmailSent(data.email_sent);
      
      if (data.email_sent) {
        setSuccess('Registration successful! Please check your email to verify your account.');
      } else {
        setSuccess('Registration successful! However, we could not send the verification email. Please contact support.');
      }

      console.log('Sign up successful! User ID:', data.user_id);

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format phone input to show only numbers and auto-format
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setFormData({ ...formData, phone: value });
    setError('');
    setSuccess('');
  };

  // Format referral ID to uppercase
  const handleReferralIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData({ ...formData, referralId: value });
    setError('');
    setSuccess('');
  };

  // Reset form and show registration form again
  const handleBackToSignUp = () => {
    setSuccess('');
    setEmailSent(false);
    setRegistrationData(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      referralId: '',
    });
  };

  // Success Screen - Show after successful registration
  if (success && registrationData) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
          
          <div className="text-center mb-8">
            <div className="text-2xl font-extrabold text-indigo-600 mb-4">
              HH HustleHub Africa
            </div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Registration Successful!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome to HustleHub Africa
            </p>
          </div>

          <div className="space-y-4">
            {emailSent ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-800">Check Your Email</h3>
                    <p className="mt-1 text-sm text-green-700">
                      We've sent a verification link to <strong>{formData.email}</strong>. 
                      Please check your inbox and click the link to verify your email address.
                    </p>
                    <p className="mt-2 text-xs text-green-600">
                      📧 If you don't see the email, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-yellow-800">Email Verification Required</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      We couldn't send the verification email automatically. Please contact support to verify your email address.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Your Account Details:</h3>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>Username:</span>
                  <span className="font-medium">{formData.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Referral ID:</span>
                  <span className="font-medium">{registrationData.referral_id}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
              <h3 className="font-semibold text-indigo-800 mb-3">Next Steps:</h3>
              <ol className="space-y-2 text-sm text-indigo-700">
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</span>
                  <span><strong>Verify your email</strong> - Click the link we sent to your email</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</span>
                  <span><strong>Wait for admin approval</strong> - Our team will review your account</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</span>
                  <span><strong>Pay activation fee</strong> - KSH 1,000 to activate your account</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</span>
                  <span><strong>Start earning!</strong> - Access surveys, content creation, and referrals</span>
                </li>
              </ol>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleBackToSignUp}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Create Another Account
              </button>
              <Link
                href="/auth/login"
                className="flex-1 inline-flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original Registration Form
  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
        
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-indigo-600 mb-4">
            HH HustleHub Africa
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join the Pan-African Earning Platform
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm font-medium" role="alert">
            {error}
          </div>
        )}
        
        {success && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
            emailSent 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
          }`} role="alert">
            <div className="flex items-start">
              {emailSent ? (
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                {success}
              </div>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignUp}>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. JohnHustle"
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores, and hyphens are allowed"
              maxLength={50}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              Letters, numbers, underscores, and hyphens only (max 50 characters)
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@email.com"
              maxLength={255}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number (M-Pesa registered) *
            </label>
            <div className="mt-1 flex rounded-xl shadow-sm">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-xl">
                +254
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="712345678"
                pattern="[0-9]{9}"
                maxLength={9}
                className="flex-1 block w-full px-4 py-2 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your 9-digit M-Pesa number without +254
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              minLength={6}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              minLength={6}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div>
            <label htmlFor="referralId" className="block text-sm font-medium text-gray-700">
              Referral ID (Optional)
            </label>
            <input
              id="referralId"
              name="referralId"
              type="text"
              value={formData.referralId}
              onChange={handleReferralIdChange}
              placeholder="Enter referral code"
              pattern="[A-Z0-9]{1,10}"
              title="1-10 uppercase letters and numbers only"
              maxLength={10}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              Uppercase letters and numbers only (max 10 characters)
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">
                I agree to the 
                <Link href="/terms" className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1">
                  Terms and Conditions
                </Link>
              </label>
            </div>
          </div>

          <div>
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
                  Creating Account...
                </>
              ) : (
                'Sign Up & Start Earning'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Registration Process:</h3>
          <ol className="text-xs text-blue-700 space-y-1">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</span>
              Sign up and verify your email
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</span>
              Pay KSH 1,000 activation fee
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</span>
              Wait for admin approval (24-48 hours)
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">4</span>
              Start earning on the platform!
            </li>
          </ol>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? 
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}

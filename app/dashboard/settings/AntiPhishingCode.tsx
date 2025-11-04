// app/dashboard/settings/AntiPhishingCode.tsx
'use client';

import { useState, useEffect } from 'react';

interface AntiPhishingCodeProps {
  userEmail: string;
  has2FA: boolean;
}

export default function AntiPhishingCode({ userEmail, has2FA }: AntiPhishingCodeProps) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  
  // Form states
  const [antiPhishingCode, setAntiPhishingCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'2fa' | 'password' | null>(null);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  // Fetch current status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/auth/anti-phishing', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Frontend: Fetched status:', data);
        const codeIsSet = data.hasAntiPhishingCode === true;
        setHasCode(codeIsSet);
        console.log('📊 Frontend: Updated hasCode state to:', codeIsSet);
      }
    } catch (error) {
      console.error('❌ Error fetching anti-phishing status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSetCode = async () => {
    if (!needsVerification) {
      // First submission - validate and request verification
      if (!antiPhishingCode) {
        setMessage({
          type: 'error',
          text: 'Please enter an anti-phishing code.',
        });
        return;
      }

      // Client-side validation
      const codeRegex = /^[a-zA-Z0-9]{6,20}$/;
      if (!codeRegex.test(antiPhishingCode)) {
        setMessage({
          type: 'error',
          text: 'Code must be 6-20 alphanumeric characters (letters and numbers only).',
        });
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const response = await fetch('/api/auth/anti-phishing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: antiPhishingCode }),
        });

        const data = await response.json();
        console.log('📊 Frontend: POST response:', data);

        if (data.needsVerification) {
          setNeedsVerification(true);
          setVerificationMethod(data.verificationMethod);
          setMessage({
            type: 'info',
            text: data.message,
          });
        } else if (response.ok && data.success) {
          console.log('✅ Frontend: Code set successfully!');
          
          // Reset form states
          setShowSetup(false);
          setNeedsVerification(false);
          setAntiPhishingCode('');
          setCurrentPassword('');
          setVerificationCode('');
          setVerificationMethod(null);
          
          // Show success message
          setMessage({
            type: 'success',
            text: data.message,
          });
          
          // Fetch the updated status
          console.log('🔄 Frontend: Fetching updated status...');
          await fetchStatus();
          
          // Force a small delay to ensure state updates
          setTimeout(() => {
            console.log('📊 Frontend: Final hasCode state:', hasCode);
          }, 100);
          
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Failed to set anti-phishing code.',
          });
        }
      } catch (error) {
        console.error('❌ Error setting anti-phishing code:', error);
        setMessage({
          type: 'error',
          text: 'An unexpected error occurred. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Second submission - with verification
      if (verificationMethod === '2fa' && !verificationCode) {
        setMessage({
          type: 'error',
          text: 'Please enter your 2FA code.',
        });
        return;
      }

      if (verificationMethod === 'password' && !currentPassword) {
        setMessage({
          type: 'error',
          text: 'Please enter your password.',
        });
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const response = await fetch('/api/auth/anti-phishing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: antiPhishingCode,
            currentPassword: verificationMethod === 'password' ? currentPassword : undefined,
            verificationCode: verificationMethod === '2fa' ? verificationCode : undefined,
            verificationMethod,
          }),
        });

        const data = await response.json();
        console.log('📊 Frontend: POST with verification response:', data);

        if (response.ok && data.success) {
          console.log('✅ Frontend: Code set successfully with verification!');
          
          // Reset all form states
          setShowSetup(false);
          setNeedsVerification(false);
          setAntiPhishingCode('');
          setCurrentPassword('');
          setVerificationCode('');
          setVerificationMethod(null);
          
          // Show success message
          setMessage({
            type: 'success',
            text: data.message,
          });
          
          // Fetch the updated status
          console.log('🔄 Frontend: Fetching updated status...');
          await fetchStatus();
          
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Verification failed.',
          });
        }
      } catch (error) {
        console.error('❌ Error setting anti-phishing code:', error);
        setMessage({
          type: 'error',
          text: 'An unexpected error occurred. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveCode = async () => {
    if (!showRemove) {
      setShowRemove(true);
      return;
    }

    if (verificationMethod === '2fa' && !verificationCode) {
      setMessage({
        type: 'error',
        text: 'Please enter your 2FA code.',
      });
      return;
    }

    if (verificationMethod === 'password' && !currentPassword) {
      setMessage({
        type: 'error',
        text: 'Please enter your password.',
      });
      return;
    }

    if (!verificationMethod) {
      // Request verification
      setLoading(true);
      setMessage(null);

      try {
        const response = await fetch('/api/auth/anti-phishing', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (data.needsVerification) {
          setVerificationMethod(data.verificationMethod);
          setMessage({
            type: 'info',
            text: data.message,
          });
        }
      } catch (error) {
        console.error('❌ Error:', error);
        setMessage({
          type: 'error',
          text: 'An unexpected error occurred.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/anti-phishing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: verificationMethod === 'password' ? currentPassword : undefined,
          verificationCode: verificationMethod === '2fa' ? verificationCode : undefined,
        }),
      });

      const data = await response.json();
      console.log('📊 Frontend: DELETE response:', data);

      if (response.ok && data.success) {
        console.log('✅ Frontend: Code removed successfully!');
        
        // Reset all states
        setShowRemove(false);
        setCurrentPassword('');
        setVerificationCode('');
        setVerificationMethod(null);
        
        // Show success message
        setMessage({
          type: 'success',
          text: data.message,
        });
        
        // Fetch the updated status
        console.log('🔄 Frontend: Fetching updated status...');
        await fetchStatus();
        
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to remove anti-phishing code.',
        });
      }
    } catch (error) {
      console.error('❌ Error removing anti-phishing code:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
        });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowSetup(false);
    setShowRemove(false);
    setNeedsVerification(false);
    setAntiPhishingCode('');
    setCurrentPassword('');
    setVerificationCode('');
    setVerificationMethod(null);
    setMessage(null);
  };

  // Debug logging for hasCode state changes
  useEffect(() => {
    console.log('📊 Frontend: hasCode state changed to:', hasCode);
  }, [hasCode]);

  if (statusLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  console.log('🎨 Frontend: Rendering with hasCode =', hasCode);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Anti-Phishing Code</h3>
          <p className="text-sm text-gray-600 mt-1">
            Protect yourself from phishing emails with a personal security code
          </p>
        </div>
        <div className="flex items-center">
          {hasCode ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Not Set
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : message.type === 'warning'
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Information Section */}
      {!showSetup && !showRemove && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              What is an Anti-Phishing Code?
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>A personal security code that appears in all legitimate emails from HustleHub Africa</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Helps you identify authentic emails and avoid phishing scams</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Your code is securely encrypted and known only to you</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>If an email doesn't contain your code, it's not from us!</span>
              </li>
            </ul>
          </div>

          {hasCode ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Anti-Phishing Code is Active</h4>
                    <p className="text-sm text-green-800">
                      All emails from HustleHub Africa will include your personal security code. 
                      Always check for this code to verify authenticity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSetup(true)}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  Update Code
                </button>
                <button
                  onClick={handleRemoveCode}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Remove Code'}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              Set Up Anti-Phishing Code
            </button>
          )}
        </div>
      )}

      {/* Setup Form */}
      {showSetup && !needsVerification && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              {hasCode ? 'Update Your Anti-Phishing Code' : 'Create Your Anti-Phishing Code'}
            </h4>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="antiPhishingCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Your Security Code
                </label>
                <input
                  id="antiPhishingCode"
                  type="text"
                  maxLength={20}
                  value={antiPhishingCode}
                  onChange={(e) => setAntiPhishingCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="e.g., MySecure2024"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  6-20 alphanumeric characters (letters and numbers only, no spaces or special characters)
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> Choose a code you'll remember. This code will appear in all our emails to you. 
                  Don't use common codes like "123456" or "password".
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={resetForm}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSetCode}
              disabled={loading || antiPhishingCode.length < 6}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Verification Form */}
      {(needsVerification || (showRemove && verificationMethod)) && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Verify Your Identity</h4>
            <div>
              <label htmlFor="verification" className="block text-sm font-medium text-gray-700 mb-2">
                {verificationMethod === '2fa' ? 'Google Authenticator Code' : 'Current Password'}
              </label>
              {verificationMethod === '2fa' ? (
                <input
                  id="verification"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  autoFocus
                />
              ) : (
                <input
                  id="verification"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  autoFocus
                />
              )}
              <p className="text-sm text-gray-500 mt-2">
                {verificationMethod === '2fa'
                  ? 'Enter the 6-digit code from your Google Authenticator app'
                  : 'Enter your account password to confirm'}
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={resetForm}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={showRemove ? handleRemoveCode : handleSetCode}
              disabled={
                loading ||
                (verificationMethod === '2fa' && verificationCode.length !== 6) ||
                (verificationMethod === 'password' && !currentPassword)
              }
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Warning when removing */}
      {showRemove && !verificationMethod && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Remove Anti-Phishing Code?</h4>
                <p className="text-sm text-red-800">
                  Removing your anti-phishing code will make it harder to identify legitimate emails from HustleHub Africa. 
                  You'll be more vulnerable to phishing attacks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={resetForm}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveCode}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Yes, Remove Code'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

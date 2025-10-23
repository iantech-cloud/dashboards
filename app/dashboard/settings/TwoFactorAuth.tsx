// app/dashboard/settings/TwoFactorAuth.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TwoFactorAuthProps {
  userEmail: string;
}

export default function TwoFactorAuth({ userEmail }: TwoFactorAuthProps) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Fetch current 2FA status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFAEnabled(data.twoFAEnabled || false);
        setSetupInProgress(data.setupInProgress || false);
        
        // If setup is in progress, automatically show the enable flow
        if (data.setupInProgress) {
          handleEnable2FA();
        }
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQrCode(data.qrCode);
        setShowQRCode(true);
        setSetupInProgress(true);
        setMessage({
          type: 'info',
          text: data.message || 'Scan the QR code with Google Authenticator and enter the 6-digit code below.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to enable 2FA. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid 6-digit code.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTwoFAEnabled(true);
        setSetupInProgress(false);
        setShowQRCode(false);
        setQrCode(null);
        setVerificationCode('');
        setMessage({
          type: 'success',
          text: '2FA has been successfully enabled! You will need to use Google Authenticator to log in from now on.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Invalid verification code. Please try again.',
        });
        setVerificationCode(''); // Clear for retry
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTwoFAEnabled(false);
        setSetupInProgress(false);
        setShowQRCode(false);
        setQrCode(null);
        setMessage({
          type: 'success',
          text: '2FA has been successfully disabled.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to disable 2FA. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSetup = async () => {
    if (!confirm('Are you sure you want to cancel 2FA setup?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSetupInProgress(false);
        setShowQRCode(false);
        setQrCode(null);
        setVerificationCode('');
        setMessage({
          type: 'info',
          text: '2FA setup has been cancelled.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to cancel 2FA setup. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error cancelling 2FA setup:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add an extra layer of security to your account using Google Authenticator
          </p>
        </div>
        <div className="flex items-center">
          {twoFAEnabled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Disabled
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
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {!twoFAEnabled && !showQRCode && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Why enable 2FA?</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Protect your account from unauthorized access</li>
              <li>Secure your earnings and personal information</li>
              <li>Required for certain high-value transactions</li>
              <li>Industry-standard security practice</li>
            </ul>
          </div>

          <button
            onClick={handleEnable2FA}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </button>
        </div>
      )}

      {showQRCode && qrCode && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">Step 1: Scan QR Code</h4>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Open Google Authenticator on your phone and scan this QR code
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Step 2: Enter Verification Code</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit Code from Google Authenticator
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelSetup}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel Setup
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Make sure to save your backup codes (if generated) in a safe place. 
              You'll need them if you lose access to your authenticator app.
            </p>
          </div>
        </div>
      )}

      {twoFAEnabled && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">2FA is Active</h4>
                <p className="text-sm text-green-800">
                  Your account is protected with two-factor authentication. You'll need your Google Authenticator code to log in.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Account: {userEmail}</h4>
            <p className="text-sm text-gray-600">
              When logging in, you'll be prompted to enter a 6-digit code from your Google Authenticator app after entering your password.
            </p>
          </div>

          <button
            onClick={handleDisable2FA}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> Disabling 2FA will make your account less secure. Only disable if absolutely necessary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

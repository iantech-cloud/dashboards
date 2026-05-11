// app/auth/login/LoginContent.tsx - COMPLETE FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut, getSession } from 'next-auth/react';
import Link from 'next/link';

// Alert Component
interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const baseClasses = "p-4 mb-4 rounded-xl shadow-md flex justify-between items-center";
  const typeClasses = {
    success: "bg-green-100 border border-green-400 text-green-700",
    error: "bg-red-100 border border-red-400 text-red-700",
    info: "bg-blue-100 border border-blue-400 text-blue-700",
  };
  
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <p className="font-medium text-sm">{message}</p>
      <button 
        onClick={onClose} 
        className="ml-4 text-lg font-bold leading-none hover:opacity-70"
      >
        &times;
      </button>
    </div>
  );
};

// Google Sign In Button Component
const GoogleSignInButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { 
        callbackUrl: callbackUrl,
        redirect: true
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      Continue with Google
    </button>
  );
};

// Magic Link Form Component
const MagicLinkForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: callbackUrl 
      });

      if (result?.error) {
        setMessage({ type: 'error', text: 'Failed to send magic link. Please try again.' });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Magic link sent! Check your email inbox and spam folder.' 
        });
        setEmail('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div>
        <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="magic-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending Magic Link...' : 'Send Magic Link'}
      </button>
    </form>
  );
};

/**
 * Utility to map NextAuth error codes to user-friendly messages
 */
const handleNextAuthError = (errorParam: string | null): { message: string } => {
  if (!errorParam) return { message: '' };
  
  if (errorParam.includes('Banned:')) {
    return { message: errorParam.replace('Banned:', 'Your account has been banned:') };
  }
  
  if (errorParam.includes('Suspended:')) {
    return { message: errorParam.replace('Suspended:', 'Your account is suspended:') };
  }

  if (errorParam.includes('TwoFactorRequired')) {
    return { message: 'Please enter your 2FA verification code to continue.' };
  }

  if (errorParam.includes('InvalidTwoFactorCode')) {
    return { message: 'Invalid 2FA verification code. Please try again.' };
  }

  switch (errorParam) {
    case 'CredentialsSignin':
      return { message: 'Invalid email or password. Please try again.' };
    case 'OAuthSignin':
      return { message: 'Error signing in with an OAuth provider.' };
    case 'OAuthCallback':
      return { message: 'An error occurred while processing the login callback.' };
    case 'EmailSignin':
      return { message: 'Error sending the email magic link.' };
    case 'Configuration':
      return { message: 'Server configuration error. Please contact support.' };
    default:
      return { message: decodeURIComponent(errorParam).replace(/_+/g, ' ') };
  }
};

// Forgot Password Modal Component
interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'email' | 'verification' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [verificationMethod, setVerificationMethod] = useState<'email' | '2fa'>('email');

  const clearMessage = () => {
    setMessage(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword,
          type: 'forgot'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.needsVerification) {
          setVerificationMethod(data.verificationMethod);
          setStep('verification');
          setMessage(data.message);
          setMessageType('info');
        } else {
          setMessage(data.message || 'Password reset instructions sent to your email.');
          setMessageType('success');
        }
      } else {
        setMessage(data.error || 'Failed to process password reset request.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword,
          verificationCode,
          verificationMethod,
          type: 'forgot'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        setMessage(data.message || 'Password reset successfully!');
        setMessageType('success');
      } else {
        setMessage(data.error || 'Failed to verify code.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage('An error occurred during verification.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setNewPassword('');
    setVerificationCode('');
    setMessage(null);
    setVerificationMethod('email');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {step === 'email' && 'Reset Password'}
              {step === 'verification' && 'Enter Verification Code'}
              {step === 'success' && 'Password Reset Successful'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              &times;
            </button>
          </div>

          {message && (
            <Alert 
              type={messageType} 
              message={message} 
              onClose={clearMessage} 
            />
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={loading}
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email || !newPassword || newPassword.length < 8}
                  className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-200 
                    ${loading || !email || !newPassword || newPassword.length < 8
                      ? 'bg-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-[1.01]'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'verification' && (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
                  {verificationMethod === '2fa' 
                    ? '6-Digit Google Authenticator Code' 
                    : '6-Digit Email Verification Code'
                  }
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-center text-xl font-mono tracking-widest"
                  disabled={loading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {verificationMethod === '2fa'
                    ? 'Open your Google Authenticator app and enter the 6-digit code'
                    : 'Check your email for the verification code'
                  }
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-200 
                    ${loading || verificationCode.length !== 6
                      ? 'bg-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-[1.01]'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Reset'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-gray-700">
                Your password has been reset successfully! You can now log in with your new password.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors font-bold"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LoginContentProps {
  hasExistingSession?: boolean;
}

export default function LoginContent({ hasExistingSession = false }: LoginContentProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2FA, setToken2FA] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'magic'>('password');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const isTimeout = searchParams.get('timeout') === 'true';
  const isJustVerified = searchParams.get('verified') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '/auth/verify-login';

  // Handle existing session message
  useEffect(() => {
    if (isJustVerified) {
      setMessage('Your email has been verified! Log in below and you will be taken to the Account Activation page to pay the KSH 1,000 fee.');
      setMessageType('success');
    } else if (hasExistingSession) {
      setMessage('You are already logged in. You can continue to your dashboard or log in with a different account.');
      setMessageType('info');
    }
    setIsCheckingSession(false);
  }, [hasExistingSession, isJustVerified]);

  // Handle URL parameters and errors
  useEffect(() => {
    if (isCheckingSession) return;

    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');

    if (successParam) {
      if (successParam === 'registered') {
        setMessage('Registration successful! Please check your email for verification.');
        setMessageType('success');
      }
      if (successParam === 'verified') {
        setMessage('Email verified successfully! You can now log in.');
        setMessageType('success');
      }
    }

    if (errorParam && errorParam !== 'SignOut') {
      const errorInfo = handleNextAuthError(errorParam);
      setMessage(errorInfo.message);
      setMessageType('error');
    }
  }, [searchParams, isCheckingSession]);

  /**
   * Enhanced user status checking with proper redirects
   */
  const checkUserStatusAndRedirect = async (callbackUrl: string) => {
    try {
      // Fetch the latest session to determine redirect
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();
      
      if (!sessionData?.user) {
        console.error('No session data after successful login');
        setMessage('Session error. Please try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }
      
      const user = sessionData.user;
      const authMethod = user.authMethod || 'credentials';
      
      console.log('User status:', {
        email: user.email,
        authMethod,
        is_verified: user.is_verified,
        profile_completed: user.profile_completed,
        isActivationPaid: user.isActivationPaid,
        activation_paid_at: user.activation_paid_at,
        is_approved: user.is_approved,
        approval_status: user.approval_status,
        is_active: user.is_active,
        status: user.status,
      });
      
      // ===== FOR GOOGLE OAUTH USERS =====
      if (authMethod === 'google') {
        console.log('Google OAuth user detected - using OAuth flow');
        
        // Google users skip email verification (Google already verified their email)
        // Check profile completion first
        if (!user.profile_completed) {
          console.log('OAuth user - Profile not completed, redirecting to complete-profile');
          router.push('/auth/complete-profile');
          return;
        }

        // Check activation payment
        if (!user.isActivationPaid && !user.activation_paid_at) {
          console.log('OAuth user - Activation not paid, redirecting to activate');
          router.push('/auth/activate');
          return;
        }

        // Check if approved
        if (!user.is_approved || user.approval_status === 'pending') {
          console.log('OAuth user - Not approved, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // Check if active
        if (!user.is_active || user.status !== 'active') {
          console.log('OAuth user - Not active, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // All checks passed - redirect to appropriate dashboard
        console.log('OAuth user - All checks passed, redirecting to dashboard');
        router.push(callbackUrl);
        return;
      }

      // ===== FOR EMAIL/CREDENTIALS USERS =====
      if (authMethod === 'credentials') {
        console.log('Credentials user detected - using credentials flow');
        
        // Check email verification FIRST for credentials users
        if (!user.is_verified) {
          console.log('Credentials user - Email not verified, redirecting to verify-email');
          router.push('/auth/verify-email');
          return;
        }

        // Profile is already completed during signup for credentials users
        console.log('Credentials user - Profile completed during signup, skipping profile check');

        // Check activation payment
        if (!user.isActivationPaid && !user.activation_paid_at) {
          console.log('Credentials user - Activation not paid, redirecting to activate');
          router.push('/auth/activate');
          return;
        }

        // Check if approved
        if (!user.is_approved || user.approval_status === 'pending') {
          console.log('Credentials user - Not approved, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // Check if active
        if (!user.is_active || user.status !== 'active') {
          console.log('Credentials user - Not active, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // All checks passed - redirect to appropriate dashboard
        console.log('Credentials user - All checks passed, redirecting to dashboard');
        router.push(callbackUrl);
        return;
      }

      // Fallback: redirect to dashboard
      console.log('Unknown auth method, fallback redirect to dashboard');
      router.push(callbackUrl);
    } catch (error) {
      console.error('Error checking user status:', error);
      setMessage('Error checking user status. Please try again.');
      setMessageType('error');
      setLoading(false);
    }
  };

  // Enhanced handlePasswordSubmit with user status checking
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      console.log('Attempting login for:', email);
      
      const result = await signIn('credentials', {
        email,
        password,
        token2FA: requires2FA ? token2FA : undefined,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        if (result.error.includes('TwoFactorRequired')) {
          console.log('2FA required, showing 2FA form');
          setRequires2FA(true);
          setMessage('Please enter your 6-digit verification code from Google Authenticator.');
          setMessageType('info');
          setLoading(false);
          return;
        }

        const errorInfo = handleNextAuthError(result.error);
        setMessage(errorInfo.message);
        setMessageType('error');
        setLoading(false);
        return;
      } 
      
      if (result?.ok) {
        console.log('Login successful! Checking user status...');
        setMessage('Login successful! Checking account status...');
        setMessageType('success');
        
        // Use the enhanced status checking function
        await checkUserStatusAndRedirect(callbackUrl);
      } else {
        console.warn('Unexpected login response:', result);
        setMessage('An unexpected login response occurred.');
        setMessageType('error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An unexpected network error occurred. Please try again.');
      setMessageType('error');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      console.log('Submitting 2FA verification for:', email);
      
      const result = await signIn('credentials', {
        email,
        password,
        token2FA,
        redirect: false,
      });

      console.log('2FA SignIn result:', result);

      if (result?.error) {
        const errorInfo = handleNextAuthError(result.error);
        setMessage(errorInfo.message);
        setMessageType('error');
        setToken2FA(''); // Clear token for retry
        setLoading(false);
        return;
      }

      if (result?.ok) {
        console.log('2FA verification successful! Checking user status...');
        setMessage('2FA verification successful! Checking account status...');
        setMessageType('success');
        
        // Use the same enhanced status checking function
        await checkUserStatusAndRedirect(callbackUrl);
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setMessage('An error occurred during 2FA verification. Please try again.');
      setMessageType('error');
      setLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  const backToPassword = () => {
    setRequires2FA(false);
    setToken2FA('');
    setMessage(null);
    setLoading(false);
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing login page...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              HustleHub Africa
            </h1>
            <p className="text-gray-600 mt-2">
              {hasExistingSession ? 'Welcome back! You are already logged in.' : 'Welcome back! Sign in to continue'}
            </p>
          </div>

          {/* Dashboard Link for logged-in users */}
          {hasExistingSession && (
            <div className="mb-6 text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
              <p className="text-sm text-gray-600 mt-2">or continue below to log in with a different account</p>
            </div>
          )}

          {/* Timeout Warning */}
          {isTimeout && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Your session expired due to inactivity. Please sign in again.
              </p>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Google Sign In */}
            <div className="mb-6">
              <GoogleSignInButton />
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'password'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Password
              </button>
              <button
                onClick={() => setActiveTab('magic')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'magic'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Magic Link
              </button>
            </div>

            {/* Messages */}
            {message && (
              <Alert 
                type={messageType} 
                message={message} 
                onClose={clearMessage} 
              />
            )}

            {/* Password Login Form */}
            {activeTab === 'password' && (
              <form onSubmit={requires2FA ? handle2FASubmit : handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={loading || requires2FA}
                  />
                </div>

                {!requires2FA && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                )}

                {requires2FA && (
                  <div>
                    <label htmlFor="token2FA" className="block text-sm font-medium text-gray-700 mb-1">
                      2FA Code
                    </label>
                    <input
                      id="token2FA"
                      type="text"
                      value={token2FA}
                      onChange={(e) => setToken2FA(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={backToPassword}
                      className="text-sm text-indigo-600 hover:text-indigo-700 mt-2"
                      disabled={loading}
                    >
                      ← Back to password
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {requires2FA ? 'Verifying...' : 'Signing in...'}
                    </span>
                  ) : requires2FA ? 'Verify & Sign In' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Magic Link Form */}
            {activeTab === 'magic' && <MagicLinkForm />}

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 block w-full"
              >
                Forgot your password?
              </button>
              <div className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/sign-up" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </>
  );
}

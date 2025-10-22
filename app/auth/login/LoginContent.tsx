// app/auth/login/LoginContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';

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
        className={`ml-4 text-lg font-bold leading-none ${typeClasses[type].split(' ').pop()?.replace('text-', 'text-')}`}
      >
        &times;
      </button>
    </div>
  );
};

/**
 * Utility to map NextAuth error codes to user-friendly messages and handle custom errors
 */
const handleNextAuthError = (errorParam: string | null): { message: string; redirectTo?: string } => {
  if (!errorParam) return { message: '' };
  
  // Handle custom error messages with redirect instructions
  if (errorParam.includes('UnverifiedEmail')) {
    return { 
      message: 'Please verify your email address before logging in.',
      redirectTo: '/auth/confirm'
    };
  }
  
  if (errorParam.includes('PaymentRequired')) {
    return { 
      message: 'Please complete the activation payment to access your account.',
      redirectTo: '/auth/activate'
    };
  }
  
  if (errorParam.includes('PendingApproval')) {
    return { 
      message: 'Your account is awaiting admin approval. Please check back later.',
      redirectTo: '/auth/pending-approval'
    };
  }
  
  if (errorParam.includes('Banned:')) {
    return { message: errorParam.replace('Banned:', 'Your account has been banned:') };
  }
  
  if (errorParam.includes('Suspended:')) {
    return { message: errorParam.replace('Suspended:', 'Your account is suspended:') };
  }
  
  if (errorParam.includes('Inactive')) {
    return { message: 'Your account is not active. Please contact support.' };
  }

  // Handle standard NextAuth errors
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

export default function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL parameters and errors
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const callbackUrl = searchParams.get('callbackUrl');
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

    if (errorParam) {
      if (errorParam === 'SignOut') return;

      const errorInfo = handleNextAuthError(errorParam);
      setMessage(errorInfo.message);
      setMessageType('error');
      
      // Auto-redirect for specific error types
      if (errorInfo.redirectTo) {
        setTimeout(() => {
          router.push(errorInfo.redirectTo!);
        }, 3000);
      }
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      console.log('Attempting login for:', email);
      
      // Sign in with credentials
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        // Handle authentication errors with specific messages
        const errorInfo = handleNextAuthError(result.error);
        setMessage(errorInfo.message);
        setMessageType('error');
        
        console.log('Login error:', result.error);
        
        // Auto-redirect for specific conditions
        if (errorInfo.redirectTo) {
          setTimeout(() => {
            router.push(errorInfo.redirectTo!);
          }, 2000);
          return;
        }
      } else if (result?.ok) {
        // Login successful - check session to determine next steps
        console.log('Login successful, checking session...');
        
        // Wait a moment for the session to be updated
        setTimeout(async () => {
          try {
            const session = await getSession();
            console.log('Session after login:', session);
            
            if (session?.user) {
              setMessage('Login successful! Checking account status...');
              setMessageType('success');
              
              // Check the user status through session data
              const user = session.user as any;
              
              console.log('User status:', {
                is_verified: user.is_verified,
                activation_paid_at: user.activation_paid_at,
                is_approved: user.is_approved,
                approval_status: user.approval_status,
                is_active: user.is_active
              });

              // Check each condition and redirect accordingly
              if (!user.is_verified) {
                setMessage('Email not verified. Redirecting to verification...');
                setTimeout(() => {
                  router.push('/auth/confirm');
                }, 1500);
                return;
              }
              
              if (!user.activation_paid_at) {
                setMessage('Account not activated. Redirecting to activation...');
                setTimeout(() => {
                  router.push('/auth/activate');
                }, 1500);
                return;
              }
              
              if (!user.is_approved || user.approval_status !== 'approved') {
                setMessage('Account pending approval. Redirecting...');
                setTimeout(() => {
                  router.push('/auth/pending-approval');
                }, 1500);
                return;
              }

              if (!user.is_active) {
                setMessage('Account is inactive. Please contact support.');
                setMessageType('error');
                return;
              }

              // ALL CONDITIONS MET - Redirect to dashboard
              setMessage('All checks passed! Redirecting to dashboard...');
              setTimeout(() => {
                // Use the dashboard route from session or default to /dashboard
                const dashboardRoute = (session as any).dashboardRoute || '/dashboard';
                console.log('Redirecting to:', dashboardRoute);
                router.push(dashboardRoute);
              }, 1000);
            } else {
              // Fallback if session is not available
              console.warn('No session found after successful login');
              setMessage('Login successful! Redirecting to dashboard...');
              setTimeout(() => {
                router.push('/dashboard');
              }, 1000);
            }
          } catch (sessionError) {
            console.error('Error getting session:', sessionError);
            setMessage('Login successful! Redirecting to dashboard...');
            setTimeout(() => {
              router.push('/dashboard');
            }, 1000);
          }
        }, 500); // Wait 500ms for session to update

      } else {
        console.warn('Unexpected login response:', result);
        setMessage('An unexpected login response occurred.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An unexpected network error occurred. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-indigo-100">
        
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-indigo-600 mb-4">
            HH HustleHub Africa
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        
        {message && (
          <Alert 
            type={messageType} 
            message={message} 
            onClose={clearMessage} 
          />
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-200 
                ${loading 
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
                  Signing In...
                </>
              ) : (
                'Sign In to Your Account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Account Status Flow:</h3>
          <ol className="text-xs text-blue-700 space-y-1">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</span>
              Verify your email address
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
              Access your dashboard and start earning!
            </li>
          </ol>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a 
            href="/auth/sign-up" 
            className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Create an account
          </a>
        </p>

        <div className="mt-4 text-center">
          <a 
            href="/auth/forgot-password" 
            className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
}

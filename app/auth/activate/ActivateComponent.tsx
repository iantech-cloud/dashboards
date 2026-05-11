'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// This page works WITHOUT a NextAuth session so that newly-verified users
// can pay the activation fee before they ever log in.
// Email is sourced from sessionStorage (written by ConfirmContent after verification)
// and verified server-side by the sessionless /api/activate/* routes.

type PageState = 'loading' | 'form' | 'already_paid' | 'email_missing' | 'error';

export default function ActivateComponent() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('error');

  const router = useRouter();
  const searchParams = useSearchParams();

  // -------------------------------------------------------------------------
  // On mount: read email from sessionStorage, then check activation status
  // -------------------------------------------------------------------------
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    const error = searchParams.get('error');

    if (paymentStatus === 'failed' || error) {
      setMessageType('error');
      setMessage(error || 'Payment failed. Please check your M-Pesa details and try again.');
    } else if (paymentStatus === 'cancelled') {
      setMessageType('info');
      setMessage('Payment was cancelled. You can try again when ready.');
    }

    async function init() {
      // Try sessionStorage first, then URL param as fallback
      let resolvedEmail =
        (typeof window !== 'undefined' ? sessionStorage.getItem('activation_email') : null) ||
        searchParams.get('email') ||
        '';

      if (!resolvedEmail) {
        setPageState('email_missing');
        return;
      }

      setEmail(resolvedEmail);

      try {
        const res = await fetch('/api/activate/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resolvedEmail }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setMessage(data.message || 'Failed to load activation status.');
          setMessageType('error');
          setPageState('error');
          return;
        }

        if (data.data?.activation_paid) {
          setPageState('already_paid');
          // Already paid — if approved, send to login; otherwise show waiting message
          if (data.data?.is_approved) {
            setTimeout(() => router.push('/auth/login'), 2000);
          }
          return;
        }

        setPageState('form');
      } catch {
        setMessage('Network error. Please refresh and try again.');
        setMessageType('error');
        setPageState('error');
      }
    }

    init();
  }, [router, searchParams]);

  // -------------------------------------------------------------------------
  // Phone helpers
  // -------------------------------------------------------------------------
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (!value.startsWith('0') && !value.startsWith('254') && value.length > 0) {
      value = '0' + value;
    }
    if (value.startsWith('0')) value = value.slice(0, 10);
    if (value.startsWith('254')) value = value.slice(0, 12);
    setPhoneNumber(value);
  };

  const isValidPhone = (phone: string): boolean => {
    const c = phone.replace(/\s/g, '');
    return (c.startsWith('0') && c.length === 10) || (c.startsWith('254') && c.length === 12);
  };

  // -------------------------------------------------------------------------
  // Form submit — call sessionless initiate API
  // -------------------------------------------------------------------------
  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/activate/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data?.checkoutRequestId) {
        // Clear the sessionStorage email — the waiting page tracks by checkoutRequestId
        sessionStorage.removeItem('activation_email');

        const params = new URLSearchParams({
          checkoutRequestId: data.data.checkoutRequestId,
          amount: (data.data.amount / 100).toString(),
          phoneNumber: data.data.phoneNumber,
          activation: 'true',
          activationPaymentId: data.data.activationPaymentId,
          email,
        });
        router.push(`/auth/activate/mpesa-waiting?${params.toString()}`);
      } else {
        setMessageType('error');
        setMessage(data.message || 'Failed to initiate payment. Please try again.');
      }
    } catch {
      setMessageType('error');
      setMessage('Network error during payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">{children}</div>
    </div>
  );

  if (pageState === 'loading') {
    return shell(
      <div className="text-center">
        <Loader2 className="animate-spin w-10 h-10 mx-auto text-indigo-600 mb-4" />
        <p className="text-gray-600">Loading activation page...</p>
      </div>,
    );
  }

  if (pageState === 'email_missing') {
    return shell(
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expired</h2>
        <p className="text-gray-600 mb-6">
          We could not find your verification session. Please click the verification link in your
          email again to restart the activation process.
        </p>
        <a
          href="/auth/login"
          className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center"
        >
          Go to Login
        </a>
      </div>,
    );
  }

  if (pageState === 'already_paid') {
    return shell(
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Already Received</h2>
        <p className="text-gray-600 mb-4">
          Your activation payment has been recorded. Your account is pending admin approval.
          Once approved you can log in and start earning.
        </p>
        <a
          href="/auth/login"
          className="block w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center"
        >
          Go to Login
        </a>
      </div>,
    );
  }

  if (pageState === 'error') {
    return shell(
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>,
    );
  }

  // pageState === 'form'
  return shell(
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Activate Your Account</h2>
        <p className="text-gray-600">Pay the one-time activation fee to complete registration</p>
        {email && <p className="text-sm text-gray-400 mt-1">{email}</p>}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-start space-x-3 ${
            messageType === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : messageType === 'error'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}
        >
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{message}</span>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v6a1 1 0 102 0V5zm-1 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-yellow-800 font-medium">Activation Fee: KSH 1,000</p>
        </div>
        <p className="text-yellow-700 text-sm mt-2">
          This one-time fee activates your account and gives you full access to the platform.
        </p>
      </div>

      <form onSubmit={handleActivation}>
        <div className="mb-6">
          <label className="block font-medium mb-2 text-gray-700">M-Pesa Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="07XXXXXXXX or 2547XXXXXXXX"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              maxLength={12}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Supported: 07XXXXXXXX or 2547XXXXXXXX</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !isValidPhone(phoneNumber)}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
              Initiating Payment...
            </>
          ) : (
            'Pay KSH 1,000 with M-Pesa'
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Enter your M-Pesa registered phone number</li>
          <li>Click the pay button</li>
          <li>Check your phone for the M-Pesa prompt</li>
          <li>Enter your M-Pesa PIN to confirm</li>
          <li>Your account will be activated and sent for admin approval</li>
        </ol>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            Sandbox mode — use test number 254708374149
          </p>
        </div>
      )}
    </>,
  );
}

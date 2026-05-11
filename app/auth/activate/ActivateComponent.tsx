'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { checkActivationStatus, initiateActivationPayment } from '@/app/actions/activation';

export default function ActivateComponent() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('error');
  const [activationStatus, setActivationStatus] = useState<any>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we're returning from a payment attempt
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    const error = searchParams.get('error');
    
    if (paymentStatus === 'failed' || error) {
      setMessageType('error');
      setMessage(
        error || 
        'Payment failed. Please check your M-Pesa details and try again.'
      );
    }
    
    if (paymentStatus === 'cancelled') {
      setMessageType('info');
      setMessage('Payment was cancelled. You can try again when ready.');
    }
  }, [searchParams]);

  useEffect(() => {
    // Check activation status using server action
    async function checkStatus() {
      try {
        const result = await checkActivationStatus();
        if (result.success) {
          setActivationStatus(result.data);
          
          // Redirect if already activated
          if (result.data?.activation_paid) {
            router.push('/dashboard');
          }
        } else {
          // 'User not authenticated' means they arrived here without a session.
          // Redirect them to login — after login verify-login will route back here.
          if (result.message === 'User not authenticated') {
            router.push('/auth/login?callbackUrl=/auth/activate');
            return;
          }
          setMessageType('error');
          setMessage(result.message || 'Failed to check activation status');
        }
      } catch (error) {
        console.error('Error checking activation status:', error);
        setMessageType('error');
        setMessage('Failed to check activation status. Please try refreshing.');
      }
    }

    checkStatus();
  }, [router]);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await initiateActivationPayment(phoneNumber);

      if (result.success && result.data?.checkoutRequestId) {
        // Redirect to M-Pesa waiting page
        const params = new URLSearchParams({
          checkoutRequestId: result.data.checkoutRequestId,
          amount: (result.data.amount / 100).toString(), // Convert cents to whole amount
          phoneNumber: result.data.phoneNumber,
          activation: 'true',
          activationPaymentId: result.data.activationPaymentId
        });
        
        router.push(`/auth/activate/mpesa-waiting?${params.toString()}`);
        
      } else {
        setMessageType('error');
        setMessage(result.message || 'Failed to initiate activation payment. Please try again.');
      }
    } catch (error) {
      console.error('Activation error:', error);
      setMessageType('error');
      setMessage('An error occurred during payment processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format phone number for display as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Auto-format based on input
    if (value.startsWith('0') && value.length <= 10) {
      value = value;
    } else if (value.startsWith('254') && value.length <= 12) {
      value = value;
    } else if (value.length > 0 && !value.startsWith('0') && !value.startsWith('254')) {
      value = '0' + value;
    }
    
    setPhoneNumber(value);
  };

  const formatPhoneForDisplay = (phone: string): string => {
    if (phone.startsWith('254') && phone.length === 12) {
      return `0${phone.substring(3)}`;
    }
    return phone;
  };

  const isValidPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) return true;
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) return true;
    return false;
  };

  if (!activationStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto text-indigo-600" />
          <p className="text-gray-600 mt-4">Checking activation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Activate Your Account</h2>
          <p className="text-gray-600">Complete your registration by paying the activation fee</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 flex items-start space-x-3 ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : messageType === 'error'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {messageType === 'success' && <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
            {messageType === 'error' && <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
            <span className="flex-1">{message}</span>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
            <label className="block font-medium mb-2 text-gray-700">
              M-Pesa Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
            <p className="text-sm text-gray-500 mt-1">
              {phoneNumber && formatPhoneForDisplay(phoneNumber)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: 07XXXXXXXX, 2547XXXXXXXX
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isValidPhone(phoneNumber)}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
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
          <h4 className="font-semibold text-blue-800 mb-2">How to activate:</h4>
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Enter your M-Pesa registered phone number</li>
            <li>Click "Pay KSH 1,000 with M-Pesa"</li>
            <li>You'll be redirected to a waiting page</li>
            <li>Check your phone for STK Push prompt</li>
            <li>Enter your M-Pesa PIN to complete</li>
            <li>Wait for confirmation on the waiting page</li>
            <li>Your account will be activated automatically</li>
          </ol>
        </div>

        {/* Sandbox Testing Note */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              🧪 <strong>Sandbox Mode:</strong> Use test numbers like 254708374149
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

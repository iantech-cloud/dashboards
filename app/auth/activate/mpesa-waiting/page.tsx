'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock, Phone, UserCheck } from 'lucide-react';
import { checkMpesaPaymentStatus, completeActivationAfterPayment } from '@/app/actions/activation';

// NOTE: The 'status' field here should align with the high-level statuses returned by your server action
interface PaymentStatus {
  status: 'processing' | 'success' | 'failed' | 'cancelled' | 'timeout';
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
}

export default function ActivationMpesaWaitingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const checkoutRequestId = searchParams.get('checkoutRequestId');
  const amount = searchParams.get('amount');
  const phoneNumber = searchParams.get('phoneNumber');
  const activationPaymentId = searchParams.get('activationPaymentId');
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ 
    status: 'processing' 
  });
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [pollingCount, setPollingCount] = useState(0);
  const [isActivatingAccount, setIsActivatingAccount] = useState(false);

  // Poll for payment status using server action
  const pollPaymentStatus = useCallback(async () => {
    if (!checkoutRequestId) return;

    try {
      // Assuming checkMpesaPaymentStatus returns:
      // { success: true, data: { status: 'completed' | 'cancelled' | 'timeout' | 'failed' | 'pending', ... } }
      const result = await checkMpesaPaymentStatus(checkoutRequestId);
      setPollingCount(prev => prev + 1);

      if (result.success && result.data) {
        // Source is not used in the UI but is included in the log from your update
        const { status, resultCode, resultDesc, mpesaReceiptNumber, amount, source } = result.data;

        // Log for debugging
        console.log(`🔄 Polling result (source: ${source}):`, { status, resultCode, resultDesc });

        // Update payment status based on the response
        setPaymentStatus(prev => {
          // Don't update if we're already in a final state and the new status isn't final
          if (['success', 'cancelled', 'timeout', 'failed'].includes(prev.status) && 
              !['completed', 'cancelled', 'timeout', 'failed'].includes(status)) {
            return prev;
          }
          
          // Map status from API/database to our UI status
          if (status === 'completed') {
            return {
              status: 'success',
              resultCode: resultCode,
              resultDesc: resultDesc,
              mpesaReceiptNumber: mpesaReceiptNumber,
              amount: amount
            };
          } else if (status === 'cancelled') {
            return {
              status: 'cancelled',
              resultCode: resultCode,
              resultDesc: resultDesc || 'Payment cancelled by user'
            };
          } else if (status === 'timeout') {
            return {
              status: 'timeout',
              resultCode: resultCode,
              resultDesc: resultDesc || 'Payment timeout'
            };
          } else if (status === 'failed') {
            return {
              status: 'failed',
              resultCode: resultCode,
              resultDesc: resultDesc || 'Payment failed'
            };
          }
          
          // Keep processing status for 'pending' or 'initiated'
          return prev;
        });

        // If payment is successful and this is an activation, activate the account
        // This must be outside the setPaymentStatus block to use await
        if (status === 'completed' && activationPaymentId) {
          // If this is an activation payment, activate the account
          await activateAccount();
        }
      } else {
        console.error('Failed to check payment status:', result.message);
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
    }
  }, [checkoutRequestId, activationPaymentId]); // Dependencies remain the same

  // Activate user account after successful payment using server action
  const activateAccount = async () => {
    // Only proceed if not already activating and we have the ID
    if (isActivatingAccount || !activationPaymentId) return;
    
    setIsActivatingAccount(true);
    try {
      const result = await completeActivationAfterPayment(activationPaymentId);
      
      if (!result.success) {
        console.error('Account activation failed:', result.message);
        // Even if activation fails, we still show payment success
        // but log the error for debugging
      }
    } catch (error) {
      console.error('Error activating account:', error);
    } finally {
      setIsActivatingAccount(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Only set to timeout if still processing
      if (paymentStatus.status === 'processing') {
        // NOTE: The server poll should ideally handle the final timeout status
        // but this client-side fallback ensures the UI updates
        setPaymentStatus({
          status: 'timeout',
          resultCode: '1037', // A common code for M-Pesa timeout
          resultDesc: 'Payment timeout - No response from user'
        });
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, paymentStatus.status]);

  // Polling interval
  useEffect(() => {
    if (paymentStatus.status !== 'processing') return;

    // NOTE: Polling frequency could be made dynamic or exponential backoff
    const interval = setInterval(pollPaymentStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [paymentStatus.status, pollPaymentStatus]);

  // Initial poll
  useEffect(() => {
    if (checkoutRequestId) {
      pollPaymentStatus();
    }
  }, [checkoutRequestId, pollPaymentStatus]);

  // Redirect if no checkoutRequestId
  useEffect(() => {
    if (!checkoutRequestId) {
      router.push('/auth/activate');
    }
  }, [checkoutRequestId, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = (status: PaymentStatus['status']) => {
    const baseConfig = {
      processing: {
        icon: <Loader2 className="animate-spin h-12 w-12 text-blue-500" />,
        title: 'Waiting for M-Pesa Response',
        description: 'Please check your phone and enter your M-Pesa PIN to complete the activation payment.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      success: {
        icon: isActivatingAccount ? 
          <Loader2 className="animate-spin h-12 w-12 text-green-500" /> : 
          <CheckCircle className="h-12 w-12 text-green-500" />,
        title: isActivatingAccount ? 'Activating Your Account...' : 'Activation Successful!',
        description: isActivatingAccount ? 
          'Your payment was successful! Now activating your account...' : 
          `Your account has been activated successfully! Welcome to the platform.`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      cancelled: {
        icon: <XCircle className="h-12 w-12 text-orange-500" />,
        title: 'Payment Cancelled',
        description: 'You cancelled the M-Pesa payment request.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      timeout: {
        icon: <Clock className="h-12 w-12 text-red-500" />,
        title: 'Payment Timeout',
        description: 'The payment request timed out. Please try again.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      failed: {
        icon: <XCircle className="h-12 w-12 text-red-500" />,
        title: 'Payment Failed',
        description: paymentStatus.resultDesc || 'The payment could not be processed.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    };
    
    return baseConfig[status];
  };

  const statusConfig = getStatusConfig(paymentStatus.status);

  if (!checkoutRequestId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h1>
          <p className="text-gray-600 mb-6">Missing activation information.</p>
          <button
            onClick={() => router.push('/auth/activate')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Back to Activation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-2xl p-8 shadow-lg`}>
        <div className="text-center">
          {statusConfig.icon}
          
          <h1 className={`text-2xl font-bold mt-6 mb-3 ${statusConfig.color}`}>
            {statusConfig.title}
          </h1>
          
          <p className="text-gray-700 mb-6 leading-relaxed">
            {statusConfig.description}
          </p>

          {/* Activation Badge */}
          {activationPaymentId && (
            <div className="mb-4 inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              <UserCheck className="w-4 h-4 mr-1" />
              Account Activation
            </div>
          )}

          {/* Transaction Details */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <span className="text-gray-500">Amount:</span>
                <div className="font-semibold">KES {amount}</div>
              </div>
              <div className="text-left">
                <span className="text-gray-500">Phone:</span>
                <div className="font-semibold">{phoneNumber}</div>
              </div>
              <div className="text-left">
                <span className="text-gray-500">Time Left:</span>
                <div className={`font-semibold ${
                  timeLeft < 30 ? 'text-red-500' : 'text-gray-900'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              <div className="text-left">
                <span className="text-gray-500">Status Checks:</span>
                <div className="font-semibold">{pollingCount}</div>
              </div>
            </div>
          </div>

          {/* Success Details */}
          {paymentStatus.status === 'success' && paymentStatus.mpesaReceiptNumber && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-green-800">
                <div className="font-semibold">M-Pesa Receipt:</div>
                <div>{paymentStatus.mpesaReceiptNumber}</div>
                {activationPaymentId && (
                  <div className="mt-2 text-xs">
                    {isActivatingAccount ? '🔄 Activating account...' : '✅ Activation fee paid successfully'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {paymentStatus.status !== 'success' && paymentStatus.status !== 'processing' && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-800">
                <div className="font-semibold">Error Code: {paymentStatus.resultCode}</div>
                <div>{paymentStatus.resultDesc}</div>
              </div>
            </div>
          )}

          {/* Instructions for Processing State */}
          {paymentStatus.status === 'processing' && (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 text-left">
                  <div className="font-semibold mb-1">What to do:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your phone for M-Pesa prompt</li>
                    <li>Enter your M-Pesa PIN when prompted</li>
                    <li>Wait for confirmation</li>
                    <li>Do not close this page</li>
                    {activationPaymentId && (
                      <li>Your account will be activated automatically</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Activation Benefits */}
          {activationPaymentId && paymentStatus.status === 'processing' && (
            <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-indigo-800 text-left">
                <div className="font-semibold mb-2">🎉 After Activation:</div>
                <ul className="space-y-1 text-xs">
                  <li>✅ Full access to all platform features</li>
                  <li>✅ Ability to complete tasks and earn money</li>
                  <li>✅ Withdrawal capabilities</li>
                  <li>✅ Referral program access</li>
                  <li>✅ Daily bonuses and rewards</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {paymentStatus.status === 'processing' && (
              <button
                onClick={() => router.push('/auth/activate')}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {(paymentStatus.status === 'success' || paymentStatus.status === 'cancelled' || 
              paymentStatus.status === 'timeout' || paymentStatus.status === 'failed') && (
              <>
                {paymentStatus.status === 'success' ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => router.push('/auth/activate')}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Activation
                    </button>
                    <button
                      onClick={() => router.push('/auth/activate')}
                      className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Debug Info (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 rounded-lg">
              <div className="text-xs text-gray-600 text-left">
                <div>CheckoutRequestID: {checkoutRequestId}</div>
                <div>ActivationPaymentID: {activationPaymentId}</div>
                <div>Status: {paymentStatus.status}</div>
                <div>Result Code: {paymentStatus.resultCode}</div>
                <div>Polling Count: {pollingCount}</div>
                <div>Activation: {activationPaymentId ? 'Yes' : 'No'}</div>
                <div>Activating Account: {isActivatingAccount ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

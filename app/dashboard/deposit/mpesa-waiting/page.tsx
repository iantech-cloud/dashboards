// app/dashboard/deposit/mpesa-waiting/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock, Phone, ArrowLeft } from 'lucide-react';
import { checkMpesaPaymentStatus } from '@/app/actions/deposit';

interface PaymentStatus {
  status: 'processing' | 'success' | 'failed' | 'cancelled' | 'timeout';
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  source?: string;
}

interface StatusConfig {
  icon: JSX.Element;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function MpesaWaitingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const checkoutRequestId = searchParams.get('checkoutRequestId');
  const amount = searchParams.get('amount');
  const phoneNumber = searchParams.get('phoneNumber');
  const merchantRequestId = searchParams.get('merchantRequestId');
  const accountReference = searchParams.get('accountReference');
  const source = searchParams.get('source');
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ 
    status: 'processing' 
  });
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds (increased from 2)
  const [pollingCount, setPollingCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Poll for payment status using server action
  const pollPaymentStatus = useCallback(async () => {
    if (!checkoutRequestId || !isPolling) return;

    try {
      console.log(`🔄 Polling payment status (attempt ${pollingCount + 1})...`);
      
      const result = await checkMpesaPaymentStatus(checkoutRequestId);
      setPollingCount(prev => prev + 1);

      console.log('Payment status result:', result);

      if (result.success && result.data) {
        const { status, resultCode, resultDesc, mpesaReceiptNumber, source } = result.data;

        // Update payment status based on server response
        setPaymentStatus({
          status: status as PaymentStatus['status'],
          resultCode,
          resultDesc,
          mpesaReceiptNumber,
          amount: Number(amount),
          source
        });

        // Stop polling if transaction is completed or failed
        if (['success', 'failed', 'cancelled', 'timeout'].includes(status)) {
          setIsPolling(false);
          console.log(`✅ Stopped polling - Final status: ${status}`);
        }

      } else {
        console.error('Failed to check payment status:', result.message);
        // Don't stop polling on API errors, just log them
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
      // Don't stop polling on network errors
    }
  }, [checkoutRequestId, amount, pollingCount, isPolling]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (paymentStatus.status === 'processing') {
        setPaymentStatus({
          status: 'timeout',
          resultCode: 1037,
          resultDesc: 'Payment timeout - No response from M-Pesa'
        });
        setIsPolling(false);
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
    if (!isPolling || paymentStatus.status !== 'processing') return;

    const interval = setInterval(pollPaymentStatus, 4000); // Poll every 4 seconds (reduced frequency)
    return () => clearInterval(interval);
  }, [isPolling, paymentStatus.status, pollPaymentStatus]);

  // Initial poll
  useEffect(() => {
    if (checkoutRequestId && isPolling) {
      // Initial poll after a short delay
      const initialPollTimer = setTimeout(() => {
        pollPaymentStatus();
      }, 2000);
      
      return () => clearTimeout(initialPollTimer);
    }
  }, [checkoutRequestId, pollPaymentStatus, isPolling]);

  // Redirect if no checkoutRequestId
  useEffect(() => {
    if (!checkoutRequestId) {
      router.push('/dashboard/wallet');
    }
  }, [checkoutRequestId, router]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status configuration
  const getStatusConfig = (status: PaymentStatus['status']): StatusConfig => {
    const config: Record<PaymentStatus['status'], StatusConfig> = {
      processing: {
        icon: <Loader2 className="animate-spin h-12 w-12 text-blue-500" />,
        title: 'Processing M-Pesa Payment',
        description: 'Please check your phone and enter your M-Pesa PIN to complete the payment.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      success: {
        icon: <CheckCircle className="h-12 w-12 text-green-500" />,
        title: 'Payment Successful!',
        description: `Your deposit of KES ${amount} has been completed successfully. Funds have been added to your wallet.`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      cancelled: {
        icon: <XCircle className="h-12 w-12 text-orange-500" />,
        title: 'Payment Cancelled',
        description: 'The M-Pesa payment request was cancelled.',
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
        description: paymentStatus.resultDesc || 'The payment could not be processed. Please try again.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    };
    
    // Return config for status or default to processing if invalid status
    return config[status] || config.processing;
  };

  const statusConfig = getStatusConfig(paymentStatus.status);

  // Handle manual retry
  const handleRetryPolling = () => {
    if (paymentStatus.status === 'processing') return;
    
    setPaymentStatus({ status: 'processing' });
    setTimeLeft(180);
    setPollingCount(0);
    setIsPolling(true);
    pollPaymentStatus();
  };

  if (!checkoutRequestId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-red-200 rounded-2xl p-8 shadow-lg text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h1>
          <p className="text-gray-600 mb-6">Missing transaction information.</p>
          <button
            onClick={() => router.push('/dashboard/wallet')}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-2xl p-8 shadow-lg`}>
        <div className="text-center">
          {statusConfig.icon}
          
          <h1 className={`text-2xl font-bold mt-6 mb-3 ${statusConfig.color}`}>
            {statusConfig.title}
          </h1>
          
          <p className="text-gray-700 mb-6 leading-relaxed">
            {statusConfig.description}
          </p>

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
                  timeLeft < 60 ? 'text-red-500' : timeLeft < 120 ? 'text-orange-500' : 'text-gray-900'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              <div className="text-left">
                <span className="text-gray-500">Status Checks:</span>
                <div className="font-semibold">{pollingCount}</div>
              </div>
            </div>
            
            {/* Additional transaction info */}
            {(accountReference || merchantRequestId) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {accountReference && (
                  <div className="text-left text-xs">
                    <span className="text-gray-500">Reference:</span>
                    <div className="font-mono">{accountReference}</div>
                  </div>
                )}
                {merchantRequestId && (
                  <div className="text-left text-xs mt-1">
                    <span className="text-gray-500">Request ID:</span>
                    <div className="font-mono truncate">{merchantRequestId}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Success Details */}
          {paymentStatus.status === 'success' && paymentStatus.mpesaReceiptNumber && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-green-800">
                <div className="font-semibold mb-1">M-Pesa Receipt Number:</div>
                <div className="font-mono text-lg">{paymentStatus.mpesaReceiptNumber}</div>
                <div className="text-xs mt-2 text-green-700">
                  Keep this receipt for your records
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {paymentStatus.status !== 'success' && paymentStatus.status !== 'processing' && paymentStatus.resultDesc && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-800 text-left">
                <div className="font-semibold">Error Details:</div>
                <div className="mt-1">{paymentStatus.resultDesc}</div>
                {paymentStatus.resultCode && (
                  <div className="text-xs mt-2">Error Code: {paymentStatus.resultCode}</div>
                )}
              </div>
            </div>
          )}

          {/* Instructions for Processing State */}
          {paymentStatus.status === 'processing' && (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 text-left">
                  <div className="font-semibold mb-2">What to do:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your phone for M-Pesa STK Push prompt</li>
                    <li>Enter your M-Pesa PIN when prompted</li>
                    <li>Wait for automatic confirmation</li>
                    <li>Do not close this page - it will update automatically</li>
                  </ul>
                  <div className="mt-3 text-xs text-blue-700">
                    ⏱️ This page automatically checks for payment status every 4 seconds
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            {paymentStatus.status === 'processing' && (
              <>
                <button
                  onClick={() => {
                    setIsPolling(false);
                    router.push('/dashboard/wallet');
                  }}
                  className="py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel & Return to Wallet
                </button>
                <button
                  onClick={handleRetryPolling}
                  disabled={isPolling}
                  className="py-2 px-4 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {isPolling ? 'Checking Status...' : 'Check Status Now'}
                </button>
              </>
            )}
            
            {(paymentStatus.status === 'success' || paymentStatus.status === 'cancelled' || 
              paymentStatus.status === 'timeout' || paymentStatus.status === 'failed') && (
              <>
                <button
                  onClick={() => router.push('/dashboard/wallet')}
                  className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Wallet
                </button>
                
                {(paymentStatus.status === 'cancelled' || paymentStatus.status === 'timeout' || paymentStatus.status === 'failed') && (
                  <button
                    onClick={() => router.push('/dashboard/wallet?deposit=true')}
                    className="py-3 px-4 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Try Another Deposit
                  </button>
                )}
                
                {paymentStatus.status === 'success' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="py-3 px-4 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                )}
              </>
            )}
          </div>

          {/* Status Source Info */}
          {paymentStatus.source && (
            <div className="mt-4 text-xs text-gray-500">
              Status source: {paymentStatus.source}
            </div>
          )}

          {/* Debug Info (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 rounded-lg">
              <div className="text-xs text-gray-600 text-left space-y-1">
                <div><strong>CheckoutRequestID:</strong> {checkoutRequestId}</div>
                <div><strong>Status:</strong> {paymentStatus.status}</div>
                <div><strong>Result Code:</strong> {paymentStatus.resultCode}</div>
                <div><strong>Polling Count:</strong> {pollingCount}</div>
                <div><strong>Is Polling:</strong> {isPolling ? 'Yes' : 'No'}</div>
                <div><strong>Source:</strong> {source || 'unknown'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

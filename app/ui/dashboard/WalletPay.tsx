// app/ui/dashboard/WalletPay.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Phone, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useDashboard } from '../../dashboard/DashboardContext';
import { processMpesaDeposit, validateDepositAmount } from '@/app/actions/deposit';

interface WalletPayProps {
  onDepositSuccess?: () => void;
  compact?: boolean;
}

export default function WalletPay({ onDepositSuccess, compact = false }: WalletPayProps) {
  const { user, refreshUser } = useDashboard();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-populate phone number from user profile if available
  useEffect(() => {
    if (user?.phone) {
      const formattedPhone = formatPhoneForDisplay(user.phone);
      setPhoneNumber(formattedPhone);
    }
  }, [user]);

  // Validate amount in real-time
  useEffect(() => {
    if (amount) {
      const depositAmount = parseFloat(amount);
      if (!isNaN(depositAmount)) {
        validateDepositAmount(depositAmount).then(result => {
          if (!result.valid) {
            setValidationError(result.message);
          } else {
            setValidationError(null);
          }
        });
      }
    } else {
      setValidationError(null);
    }
  }, [amount]);

  // Helper function to format phone number for display
  function formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('254')) {
      return `0${cleanPhone.substring(3)}`;
    } else if (cleanPhone.startsWith('+254')) {
      return `0${cleanPhone.substring(4)}`;
    }
    return cleanPhone;
  }

  // Helper function to format phone number for API (convert to 254 format)
  function formatPhoneForAPI(phone: string): string {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s/g, '');
    
    if (cleanPhone.startsWith('254')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      return `254${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('+254')) {
      return cleanPhone.substring(1);
    }
    
    return cleanPhone;
  }

  // Validate Kenyan phone number
  function isValidKenyanPhone(phone: string): boolean {
    if (!phone) return false;
    
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Check 254 format
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      const numberPart = cleanPhone.substring(3);
      return /^[17]\d{8}$/.test(numberPart);
    }
    
    // Check 0XX format
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      const validPrefixes = ['070', '071', '072', '073', '074', '075', '076', '079', '011', '010'];
      const prefix = cleanPhone.substring(0, 3);
      return validPrefixes.includes(prefix);
    }
    
    // Check +254 format
    if (cleanPhone.startsWith('+254') && cleanPhone.length === 13) {
      const numberPart = cleanPhone.substring(4);
      return /^[17]\d{8}$/.test(numberPart);
    }
    
    return false;
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setMessage('Please log in to make a deposit.');
      setMessageType('error');
      return;
    }

    if (!amount || !phoneNumber) {
      setMessage('Please fill in all required fields.');
      setMessageType('error');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount)) {
      setMessage('Please enter a valid amount.');
      setMessageType('error');
      return;
    }

    // Validate amount range
    if (depositAmount < 10 || depositAmount > 70000) {
      setMessage('Amount must be between KES 10 and KES 70,000.');
      setMessageType('error');
      return;
    }

    // Validate phone number
    if (!isValidKenyanPhone(phoneNumber)) {
      setMessage('Please enter a valid Kenyan phone number (07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX)');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setValidationError(null);

    try {
      const formattedPhone = formatPhoneForAPI(phoneNumber);
      
      console.log('Initiating M-Pesa deposit:', {
        amount: depositAmount,
        phoneNumber: formattedPhone
      });

      // Use the server action for deposit
      const result = await processMpesaDeposit({
        amount: depositAmount,
        phoneNumber: formattedPhone
      });

      console.log('M-Pesa STK Push response:', result);

      if (result.success && result.data?.CheckoutRequestID) {
        // Show success message
        setMessage(result.message || 'M-Pesa payment initiated successfully!');
        setMessageType('success');
        
        // Clear form
        setAmount('');
        
        // Refresh user data
        if (refreshUser) {
          await refreshUser();
        }
        
        // Call success callback if provided
        if (onDepositSuccess) {
          onDepositSuccess();
        }

        // Redirect to M-Pesa waiting page after a short delay
        setTimeout(() => {
          const params = new URLSearchParams({
            checkoutRequestId: result.data.CheckoutRequestID,
            amount: depositAmount.toString(),
            phoneNumber: formattedPhone,
            merchantRequestId: result.data.MerchantRequestID || '',
            accountReference: result.data.AccountReference || '',
            source: 'walletpay'
          });
          
          router.push(`/dashboard/deposit/mpesa-waiting?${params.toString()}`);
        }, 2000);
        
      } else {
        setMessage(result.message || 'Failed to initiate M-Pesa payment. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('M-Pesa deposit error:', error);
      setMessage('An error occurred while initiating payment. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  if (compact) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <DollarSign className="mr-2 text-green-500" size={18} />
          Quick Deposit
        </h3>

        <form onSubmit={handleDeposit} className="space-y-3">
          {/* Amount Input */}
          <div>
            <label htmlFor="amount-compact" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (KES)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="amount-compact"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="10"
                max="70000"
                step="1"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-1">
            {quickAmounts.slice(0, 3).map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                KES {quickAmount}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !user || !amount || !phoneNumber}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow transition duration-200 disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-1" size={16} />
                Processing...
              </>
            ) : (
              'Deposit'
            )}
          </button>
        </form>

        {/* Messages */}
        {message && (
          <div className={`mt-3 p-2 rounded text-center text-sm font-medium ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : messageType === 'error'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}>
            {messageType === 'success' && <CheckCircle className="inline mr-1" size={14} />}
            {messageType === 'error' && <AlertCircle className="inline mr-1" size={14} />}
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <DollarSign className="mr-2 text-green-500" />
        Deposit via M-Pesa
      </h3>

      <form onSubmit={handleDeposit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount (KES) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (min: 10, max: 70,000)"
              min="10"
              max="70000"
              step="1"
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                validationError ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={isLoading}
            />
          </div>
          {validationError && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="mr-1" size={14} />
              {validationError}
            </p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-gray-300"
                disabled={isLoading}
              >
                KES {quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Phone Number Input */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            M-Pesa Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX"
              pattern="[0-9+\s]{10,13}"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mt-1 flex items-start space-x-1">
            <Info className="text-gray-400 mt-0.5 flex-shrink-0" size={14} />
            <p className="text-xs text-gray-500">
              Enter your M-Pesa registered phone number. Supported formats: 07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !user || validationError !== null}
          className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition duration-200 disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Initiating Payment...
            </>
          ) : (
            'Deposit via M-Pesa'
          )}
        </button>
      </form>

      {/* Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : messageType === 'error'
            ? 'bg-red-100 text-red-700 border border-red-300'
            : 'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          <div className="flex items-center justify-center">
            {messageType === 'success' && <CheckCircle className="mr-2" size={16} />}
            {messageType === 'error' && <AlertCircle className="mr-2" size={16} />}
            {message}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
          <Info className="mr-2" size={16} />
          How to deposit:
        </h4>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Enter amount and your M-Pesa phone number</li>
          <li>Click "Deposit via M-Pesa"</li>
          <li>Check your phone for STK Push prompt</li>
          <li>Enter your M-Pesa PIN to complete</li>
          <li>Wait for confirmation</li>
          <li>Funds will be added to your wallet instantly</li>
        </ol>
      </div>

      {/* Security Notice */}
      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start space-x-2">
          <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <p className="text-sm font-medium text-green-800">Secure & Instant</p>
            <p className="text-xs text-green-700">Your payment is processed securely via M-Pesa. Funds are added instantly upon confirmation.</p>
          </div>
        </div>
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
  );
}

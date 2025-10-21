// app/dashboard/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Phone, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import TransactionHistory from '@/app/ui/dashboard/TransactionHistory';
import Alert from '@/app/ui/Alert';
import { useDashboard } from '../../dashboard/DashboardContext';
import { processWithdrawal } from '@/app/actions/transactions';
import { processMpesaDeposit, getDepositHistory, getUserBalance } from '@/app/actions/deposit';

// Match the Transaction interface from TransactionHistory
interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY';
  amount: number;
  description: string;
  status: string;
  date: string;
}

export default function WalletPage() {
  const { user } = useDashboard();
  const router = useRouter();
  
  if (!user) {
    return <div className="p-8 text-center text-red-500 font-medium">User data is unavailable. Please refresh or check your data source.</div>;
  }
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState(user.phone || '');
  const [depositPhoneNumber, setDepositPhoneNumber] = useState(user.phone ? formatPhoneForDisplay(user.phone) : '');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [depositMessageType, setDepositMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [currentBalance, setCurrentBalance] = useState(user.balance || 0);

  // Helper function to format phone number for display
  function formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('254')) {
      return `0${cleanPhone.substring(3)}`;
    } else if (cleanPhone.startsWith('+254')) {
      return `0${cleanPhone.substring(4)}`;
    } else if (cleanPhone.startsWith('01')) {
      return `0${cleanPhone.substring(1)}`;
    }
    return cleanPhone;
  }

  // Helper function to format phone number for API (convert to 254 format)
  function formatPhoneForAPI(phone: string): string {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('254')) {
      return cleanPhone;
    } else if (cleanPhone.startsWith('0')) {
      return `254${cleanPhone.substring(1)}`;
    } else if (cleanPhone.startsWith('+254')) {
      return cleanPhone.substring(1);
    }
    return `254${cleanPhone}`;
  }

  // Function to transform transaction data to match TransactionHistory interface
  const transformTransaction = (tx: any): Transaction => {
    console.log('Transforming transaction:', tx);
    
    // Handle amount safely
    let amount = 0;
    if (tx.amount_cents && !isNaN(tx.amount_cents)) {
      amount = tx.amount_cents / 100;
    } else if (tx.amount && !isNaN(tx.amount)) {
      amount = tx.amount;
    }
    
    // Handle description safely
    let description = tx.description || 
                     tx.transaction_desc || 
                     `Transaction ${tx.type || 'DEPOSIT'}`;
    
    // Handle date safely
    let date = tx.created_at || 
               tx.date || 
               tx.transaction_date;
    
    // Validate date
    if (!date || isNaN(new Date(date).getTime())) {
      date = new Date().toISOString();
      console.warn('Invalid date found, using current date');
    }

    // Map transaction types to match TransactionHistory interface
    let type: Transaction['type'] = 'DEPOSIT';
    const txType = (tx.type || '').toUpperCase();
    
    switch (txType) {
      case 'DEPOSIT':
        type = 'DEPOSIT';
        break;
      case 'WITHDRAW':
      case 'WITHDRAWAL':
        type = 'WITHDRAWAL';
        break;
      case 'BONUS':
        type = 'BONUS';
        break;
      case 'TASK_PAYMENT':
        type = 'TASK_PAYMENT';
        break;
      case 'SPIN_WIN':
        type = 'SPIN_WIN';
        break;
      case 'REFERRAL':
        type = 'REFERRAL';
        break;
      case 'SURVEY':
        type = 'SURVEY';
        break;
      default:
        // Default to DEPOSIT for unknown types
        type = 'DEPOSIT';
    }

    return {
      id: tx.id || tx._id?.toString() || `tx-${Date.now()}-${Math.random()}`,
      type: type,
      amount: amount,
      description: description,
      date: date,
      status: tx.status || 'completed'
    };
  };

  // Fetch transactions and balance
  const fetchWalletData = async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Fetching wallet data...');

      // Fetch transactions from deposit history
      const result = await getDepositHistory(50, 1);
      if (result.success && result.data) {
        console.log('✅ Fetched deposit transactions:', result.data.length);
        const transformedTransactions: Transaction[] = result.data.map(transformTransaction);
        
        // Sort transactions by date (newest first)
        const sortedTransactions = transformedTransactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setTransactions(sortedTransactions);
        
        // Log sample transaction for debugging
        if (sortedTransactions.length > 0) {
          console.log('📊 Sample transaction:', {
            id: sortedTransactions[0].id,
            type: sortedTransactions[0].type,
            amount: sortedTransactions[0].amount,
            description: sortedTransactions[0].description,
            date: sortedTransactions[0].date,
            status: sortedTransactions[0].status
          });
        }
      } else {
        console.log('❌ No deposit history found or error:', result.message);
        setTransactions([]);
      }

      // Fetch current balance
      const balanceResult = await getUserBalance();
      if (balanceResult.success && balanceResult.data) {
        console.log('💰 Fetched balance:', balanceResult.data.balance);
        setCurrentBalance(balanceResult.data.balance);
      } else {
        console.log('❌ Failed to fetch balance:', balanceResult.message);
      }
    } catch (error) {
      console.error('💥 Error fetching wallet data:', error);
      setMessage('Failed to load wallet data. Please try refreshing.');
      setMessageType('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchWalletData();
  }, []);

  // Auto-populate phone number when user data changes
  useEffect(() => {
    if (user?.phone) {
      const formattedPhone = formatPhoneForDisplay(user.phone);
      setDepositPhoneNumber(formattedPhone);
      // Also set withdrawal M-Pesa number if empty
      if (!mpesaNumber) {
        setMpesaNumber(user.phone);
      }
    }
  }, [user, mpesaNumber]);

  const handleRefresh = async () => {
    await fetchWalletData();
    setMessage('Wallet data refreshed successfully');
    setMessageType('success');
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setDepositMessage('Please enter a valid deposit amount.');
      setDepositMessageType('error');
      return;
    }

    if (amount < 10 || amount > 70000) {
      setDepositMessage('Amount must be between KES 10 and KES 70,000.');
      setDepositMessageType('error');
      return;
    }

    if (!depositPhoneNumber) {
      setDepositMessage('Please enter your M-Pesa phone number.');
      setDepositMessageType('error');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(07\d{8}|2547\d{8}|\+2547\d{8}|01\d{7,8})$/;
    const cleanPhone = depositPhoneNumber.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setDepositMessage('Please enter a valid Kenyan phone number (07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX, or 01XXXXXXXX)');
      setDepositMessageType('error');
      return;
    }

    setIsProcessingDeposit(true);
    setDepositMessage(null);

    try {
      const formattedPhone = formatPhoneForAPI(depositPhoneNumber);
      
      console.log('Initiating deposit with:', {
        amount,
        phoneNumber: formattedPhone
      });

      // Use server action for deposit
      const result = await processMpesaDeposit({
        amount,
        phoneNumber: formattedPhone
      });

      console.log('M-Pesa STK Push response:', result);

      if (result.success && result.data?.CheckoutRequestID) {
        // Redirect to M-Pesa waiting page
        const params = new URLSearchParams({
          checkoutRequestId: result.data.CheckoutRequestID,
          amount: amount.toString(),
          phoneNumber: formattedPhone,
          merchantRequestId: result.data.MerchantRequestID || '',
          accountReference: result.data.AccountReference || '',
          source: 'wallet'
        });
        
        router.push(`/dashboard/deposit/mpesa-waiting?${params.toString()}`);
        
      } else {
        setDepositMessage(result.message || 'Failed to initiate M-Pesa payment. Please try again.');
        setDepositMessageType('error');
      }
    } catch (error) {
      console.error('M-Pesa deposit error:', error);
      setDepositMessage('An error occurred while initiating payment. Please try again.');
      setDepositMessageType('error');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    const today = new Date();
    today.setTime(today.getTime() + (3 * 60 * 60 * 1000));  
    const isFriday = today.getDay() === 5;

    if (!isFriday) {
      setMessage('Withdrawals are only allowed on Fridays.');
      setMessageType('error');
      return;
    }

    if (user.lastWithdrawalDate) {
      const lastWithdrawal = new Date(user.lastWithdrawalDate);
      const currentFridayStart = new Date(today);
      currentFridayStart.setHours(0, 0, 0, 0);
      if (lastWithdrawal >= currentFridayStart) {
        setMessage('You have already made a withdrawal this Friday. Try again next Friday.');
        setMessageType('error');
        return;
      }
    }

    if (isNaN(amount) || amount < 1000) {
      setMessage('Minimum withdrawal amount is KSH 1000.');
      setMessageType('error');
      return;
    }
    if (amount > currentBalance) {
      setMessage(`Insufficient balance. Available: KES ${currentBalance.toFixed(2)}.`);
      setMessageType('error');
      return;
    }
    
    // Validate M-Pesa number format
    const cleanMpesaNumber = mpesaNumber.replace(/\s/g, '');
    if (!cleanMpesaNumber.match(/^254[17]\d{8}$/)) {
      setMessage('Please enter a valid M-Pesa number (format: 2547XXXXXXXX or 2541XXXXXXXX).');
      setMessageType('error');
      return;
    }

    // Use server action for withdrawal (from transactions)
    const result = await processWithdrawal({
      amount,
      mpesaNumber: cleanMpesaNumber
    });

    if (result.success && result.data) {
      setMessage(`Withdrawal request submitted! Transaction ID: ${result.data.transactionCode}. Pending admin approval.`);
      setMessageType('success');
      setWithdrawAmount('');
      
      // Refresh balance and transactions
      await fetchWalletData();
    } else {
      setMessage(result.message || 'Withdrawal failed.');
      setMessageType('error');
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-gray-800 border-b pb-2">Wallet & Pay</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-blue-300"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {message && <Alert type={messageType} message={message} onClose={() => setMessage(null)} />}
      
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Current Balance: KES {currentBalance.toFixed(2)}</h3>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deposit Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg text-gray-700 flex items-center">
              <DollarSign className="mr-2 text-green-500" size={20} />
              Deposit via M-Pesa
            </h4>
            
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (KES) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="depositAmount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount (min: 10, max: 70,000)"
                  min="10"
                  max="70000"
                  step="1"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                  disabled={isProcessingDeposit}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setDepositAmount(quickAmount.toString())}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  disabled={isProcessingDeposit}
                >
                  KES {quickAmount}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="depositPhone" className="block text-sm font-medium text-gray-700 mb-2">
                M-Pesa Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="depositPhone"
                  type="tel"
                  value={depositPhoneNumber}
                  onChange={(e) => setDepositPhoneNumber(e.target.value)}
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                  disabled={isProcessingDeposit}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your M-Pesa registered phone number
              </p>
            </div>

            <button 
              onClick={handleDeposit} 
              disabled={isProcessingDeposit}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg shadow-md transition duration-200 flex items-center justify-center"
            >
              {isProcessingDeposit ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Initiating Payment...
                </>
              ) : (
                'Deposit via M-Pesa'
              )}
            </button>

            {depositMessage && (
              <div className={`p-3 rounded-lg text-center font-medium ${
                depositMessageType === 'success' 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : depositMessageType === 'error'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-blue-100 text-blue-700 border border-blue-300'
              }`}>
                {depositMessageType === 'success' && <CheckCircle className="inline mr-2" size={16} />}
                {depositMessageType === 'error' && <AlertCircle className="inline mr-2" size={16} />}
                {depositMessage}
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">How to deposit:</h5>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Enter amount and your M-Pesa phone number</li>
                <li>Click "Deposit via M-Pesa"</li>
                <li>You'll be redirected to a waiting page</li>
                <li>Check your phone for STK Push prompt</li>
                <li>Enter your M-Pesa PIN to complete</li>
                <li>Wait for confirmation on the waiting page</li>
                <li>Funds will be added to your wallet instantly</li>
              </ol>
            </div>
          </div>

          {/* Withdrawal Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg text-gray-700">Withdraw</h4>
            
            <div>
              <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (KES) *
              </label>
              <input
                id="withdrawAmount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount (min KSH 1000)"
                min="1000"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150 shadow-inner"
                required
              />
            </div>

            <div>
              <label htmlFor="withdrawMpesa" className="block text-sm font-medium text-gray-700 mb-2">
                M-Pesa Number *
              </label>
              <input
                id="withdrawMpesa"
                type="text"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                placeholder="M-Pesa Number (2547XXXXXXXX)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-150 shadow-inner"
                required
              />
            </div>

            <button 
              onClick={handleWithdraw} 
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
            >
              Withdraw
            </button>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700 text-center">
                💡 Withdrawals are only allowed on Fridays.
              </p>
            </div>

            {/* Withdrawal Instructions */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <h5 className="font-semibold text-orange-800 mb-2">Withdrawal Information:</h5>
              <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                <li>Minimum withdrawal: KES 1,000</li>
                <li>Withdrawals processed on Fridays only</li>
                <li>One withdrawal per week allowed</li>
                <li>Funds are sent to your M-Pesa number</li>
                <li>Processing may take 24-48 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction History Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Transaction History</h3>
          <div className="text-sm text-gray-500">
            {transactions.length} transactions found
          </div>
        </div>
        
        <TransactionHistory 
          transactions={transactions} 
          title=""
          limit={20}
        />
      </div>

      {/* Sandbox Testing Note */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            🧪 <strong>Sandbox Mode:</strong> Use test numbers like 254708374149 for M-Pesa testing
          </p>
        </div>
      )}
    </div>
  );
}

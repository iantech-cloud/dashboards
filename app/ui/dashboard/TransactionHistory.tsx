// app/ui/dashboard/TransactionHistory.tsx
'use client';

import { Award, Wallet, Send, RotateCw, Users, XCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { MinusCircle } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY' | 'ACTIVATION_FEE' | 'COMPANY_REVENUE' | 'ACCOUNT_ACTIVATION';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  date: string;
  transaction_code?: string;
  mpesa_receipt_number?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[] | null | undefined;
  title: string;
  limit?: number;
}

// Determine transaction flow: credit (money in - GREEN) or debit (money out - RED)
const getTransactionFlow = (type: string): 'credit' | 'debit' => {
  const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
  return creditTypes.includes(type.toUpperCase()) ? 'credit' : 'debit';
};

// Get status badge styling
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return {
        Icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Completed'
      };
    case 'pending':
      return {
        Icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Pending'
      };
    case 'failed':
      return {
        Icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Failed'
      };
    case 'cancelled':
      return {
        Icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'Cancelled'
      };
    case 'timeout':
      return {
        Icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        label: 'Timeout'
      };
    default:
      return {
        Icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: status
      };
  }
};

// Get transaction icon and styling based on type
const getTransactionMeta = (type: string, status: string) => {
  const flow = getTransactionFlow(type);
  
  // Only show green/red for COMPLETED transactions
  // For failed/cancelled/timeout, show appropriate status colors
  let color: string;
  let bgColor: string;
  
  if (status === 'completed') {
    // Completed: Credit = GREEN, Debit = RED
    color = flow === 'credit' ? 'text-green-600' : 'text-red-600';
    bgColor = flow === 'credit' ? 'bg-green-100' : 'bg-red-100';
  } else if (status === 'pending') {
    color = 'text-yellow-600';
    bgColor = 'bg-yellow-100';
  } else if (status === 'cancelled') {
    color = 'text-gray-600';
    bgColor = 'bg-gray-100';
  } else if (status === 'timeout') {
    color = 'text-orange-600';
    bgColor = 'bg-orange-100';
  } else {
    // Failed
    color = 'text-red-600';
    bgColor = 'bg-red-100';
  }

  let Icon;
  switch (type.toUpperCase()) {
    case 'DEPOSIT':
      Icon = Wallet;
      break;
    case 'WITHDRAWAL':
      Icon = Send;
      break;
    case 'SPIN_WIN':
      Icon = RotateCw;
      break;
    case 'REFERRAL':
      Icon = Users;
      break;
    case 'SURVEY':
    case 'TASK_PAYMENT':
    case 'BONUS':
      Icon = Award;
      break;
    case 'ACTIVATION_FEE':
    case 'ACCOUNT_ACTIVATION':
    case 'COMPANY_REVENUE':
      Icon = MinusCircle;
      break;
    default:
      Icon = MinusCircle;
      break;
  }
  
  return { Icon, color, bgColor, flow };
};

export default function TransactionHistory({ transactions, title, limit }: TransactionHistoryProps) {
  // Ensure transactions is an array
  const safeTransactions: Transaction[] = Array.isArray(transactions) ? transactions : [];

  // Sort by date (newest first)
  const sortedTxs = safeTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Apply limit
  const displayTxs = limit ? sortedTxs.slice(0, limit) : sortedTxs;

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {displayTxs.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">No transactions found.</p>
        ) : (
          <ul>
            {displayTxs.map((tx) => {
              const { Icon, color, bgColor, flow } = getTransactionMeta(tx.type, tx.status);
              const statusBadge = getStatusBadge(tx.status);
              
              return (
                <li 
                  key={tx.id} 
                  className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <div className={`p-2 rounded-full mr-3 ${bgColor} ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 capitalize">
                          {tx.description}
                        </p>
                        {/* Status Badge */}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bgColor} ${statusBadge.color}`}>
                          <statusBadge.Icon size={12} />
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {tx.transaction_code && (
                          <p className="text-xs text-gray-400 font-mono">
                            {tx.transaction_code}
                          </p>
                        )}
                        {tx.mpesa_receipt_number && (
                          <p className="text-xs text-blue-600 font-mono">
                            M-Pesa: {tx.mpesa_receipt_number}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount - Only show +/- for completed transactions */}
                  <div className="text-right">
                    <p className={`font-bold text-lg ${color}`}>
                      {tx.status === 'completed' && (flow === 'credit' ? '+' : '-')}
                      KES {tx.amount.toFixed(2)}
                    </p>
                    {tx.status !== 'completed' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {flow === 'credit' ? 'Incoming' : 'Outgoing'}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

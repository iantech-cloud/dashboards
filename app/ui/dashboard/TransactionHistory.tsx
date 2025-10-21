// app/ui/dashboard/TransactionHistory.tsx
'use client';

import { Award, Wallet, Send, RotateCw, Users, TrendingUp } from 'lucide-react';
import { MinusCircle } from 'lucide-react';

// Expanded Transaction interface
interface Transaction {
  id: string;
  // Updated type union to include all new types: SPIN_WIN, REFERRAL, SURVEY, TASK_PAYMENT
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY';
  amount: number;
  description: string;
  status: string; // Included status from definitions.ts for completeness
  date: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[] | null | undefined; // Added null/undefined for safety
  title: string;
  limit?: number;
}

// Helper to determine icon based on transaction type
const getTransactionMeta = (type: string) => {
  const isCredit = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'].includes(type.toUpperCase());
  const color = isCredit ? 'text-green-600' : 'text-red-600';
  const bgColor = isCredit ? 'bg-green-100' : 'bg-red-100';

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
    default:
      Icon = MinusCircle;
      break;
  }
  return { Icon, color, bgColor, isCredit };
};

export default function TransactionHistory({ transactions, title, limit }: TransactionHistoryProps) {
  // CRITICAL FIX: Ensure transactions is an array before processing
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
              const { Icon, color, bgColor, isCredit } = getTransactionMeta(tx.type);
              
              return (
                <li 
                  key={tx.id} 
                  className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${bgColor} ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 capitalize">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${color}`}>
                    {isCredit ? '+' : '-'}KES {tx.amount.toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

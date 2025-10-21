// app/admin/transactions/page.tsx
"use client";

import { useState, useEffect } from 'react';

interface Transaction {
  _id: string;
  user: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockTransactions: Transaction[] = [
      { _id: '1', user: 'john@example.com', amount: 50, type: 'credit', status: 'completed', date: new Date().toISOString() },
      { _id: '2', user: 'jane@example.com', amount: 25, type: 'debit', status: 'pending', date: new Date().toISOString() },
    ];
    setTransactions(mockTransactions);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id} className="border-t">
                <td className="p-3">{t.user}</td>
                <td className="p-3">KES {t.amount}</td>
                <td className="p-3 capitalize">{t.type}</td>
                <td className="p-3 capitalize">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

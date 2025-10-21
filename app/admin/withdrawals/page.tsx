// app/admin/withdrawals/page.tsx
"use client";

import { useState, useEffect } from 'react';

interface Withdrawal {
  _id: string;
  user: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData: Withdrawal[] = [
      { _id: '1', user: 'john@example.com', amount: 100, status: 'pending', date: new Date().toISOString() },
      { _id: '2', user: 'jane@example.com', amount: 50, status: 'approved', date: new Date().toISOString() },
    ];
    setWithdrawals(mockData);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-6">Loading withdrawals...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Withdrawals</h1>
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w._id} className="border-t">
                <td className="p-3">{w.user}</td>
                <td className="p-3">KES {w.amount}</td>
                <td className="p-3 capitalize">{w.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

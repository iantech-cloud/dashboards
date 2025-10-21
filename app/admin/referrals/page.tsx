// app/admin/referrals/page.tsx
"use client";

import { useState, useEffect } from 'react';

interface Referral {
  _id: string;
  referrer: string;
  referred_user: string;
  status: 'pending' | 'completed' | 'cancelled';
  bonus_amount: number;
  created_at: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockReferrals: Referral[] = [
      {
        _id: '1',
        referrer: 'john@example.com',
        referred_user: 'jane@example.com',
        status: 'completed',
        bonus_amount: 10,
        created_at: new Date().toISOString(),
      },
      {
        _id: '2',
        referrer: 'mike@example.com',
        referred_user: 'sarah@example.com',
        status: 'pending',
        bonus_amount: 10,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        _id: '3',
        referrer: 'alex@example.com',
        referred_user: 'tom@example.com',
        status: 'cancelled',
        bonus_amount: 10,
        created_at: new Date(Date.now() - 172800000).toISOString(),
      }
    ];

    setReferrals(mockReferrals);
    setLoading(false);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-gray-600 mt-2">User referral program tracking</p>
        </div>

        {/* Referrals Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.referrer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.referred_user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {referral.bonus_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(referral.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {referrals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No referrals found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

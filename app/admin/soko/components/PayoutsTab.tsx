// app/admin/soko/components/PayoutsTab.tsx
import Link from 'next/link';
import { CheckCircle, Clock } from 'lucide-react';

interface PendingPayout {
  _id: string;
  user_id: string;
  username: string;
  amount: number;
  payout_method: string;
  requested_at: string;
  conversion_count: number;
}

interface PayoutsTabProps {
  payouts: PendingPayout[];
}

export default function PayoutsTab({ payouts }: PayoutsTabProps) {
  return (
    <div className="space-y-4">
      {payouts.length > 0 ? payouts.map(payout => (
        <div key={payout._id} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-bold text-gray-900">{payout.username}</h4>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">PENDING</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>User ID: {payout.user_id}</p>
                <p>Method: {payout.payout_method.replace('_', ' ').toUpperCase()}</p>
                <p>Requested: {new Date(payout.requested_at).toLocaleDateString()}</p>
                <p>{payout.conversion_count} conversions included</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 mb-3">KES {payout.amount.toFixed(2)}</div>
              <Link href={`/admin/soko/payout/${payout._id}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Review
              </Link>
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending payouts</p>
        </div>
      )}
    </div>
  );
}

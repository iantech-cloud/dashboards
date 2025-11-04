// app/admin/soko/components/ConversionsTab.tsx
import Link from 'next/link';
import { CheckCircle, TrendingUp } from 'lucide-react';

interface PendingConversion {
  _id: string;
  user_id: string;
  username: string;
  campaign_name: string;
  order_id: string;
  sale_amount: number;
  commission_amount: number;
  conversion_date: string;
}

interface ConversionsTabProps {
  conversions: PendingConversion[];
}

export default function ConversionsTab({ conversions }: ConversionsTabProps) {
  return (
    <div className="space-y-4">
      {conversions.length > 0 ? conversions.map(conversion => (
        <div key={conversion._id} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-bold text-gray-900">{conversion.campaign_name}</h4>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">PENDING APPROVAL</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><span className="font-medium">User:</span> {conversion.username}</p>
                  <p><span className="font-medium">Order ID:</span> {conversion.order_id}</p>
                </div>
                <div>
                  <p><span className="font-medium">Sale:</span> KES {conversion.sale_amount.toFixed(2)}</p>
                  <p><span className="font-medium">Date:</span> {new Date(conversion.conversion_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 mb-3">KES {conversion.commission_amount.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mb-3">Commission</div>
              <Link href={`/admin/soko/conversion/${conversion._id}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Review
              </Link>
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending conversions</p>
        </div>
      )}
    </div>
  );
}

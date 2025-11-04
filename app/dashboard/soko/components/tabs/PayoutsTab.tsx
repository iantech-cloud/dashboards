// app/dashboard/soko/components/tabs/PayoutsTab.tsx
import { Download, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { SokoStats, Payout } from '../types';

interface PayoutsTabProps {
  stats: SokoStats | null;
  payouts: Payout[];
  onRequestPayout: () => void;
  exportToCSV: (data: any[], filename: string) => void;
}

export default function PayoutsTab({ stats, payouts, onRequestPayout, exportToCSV }: PayoutsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            <h4 className="font-bold text-green-900 text-sm sm:text-base">Available Balance</h4>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-700">
            KES {stats?.approvedCommission.toFixed(2) || '0.00'}
          </div>
          <button
            onClick={onRequestPayout}
            disabled={!stats || stats.approvedCommission < 500}
            className="mt-4 w-full py-2 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Payout
          </button>
          <p className="text-xs text-green-700 mt-2">Min. KES 500 • Processed by admin</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            <h4 className="font-bold text-yellow-900 text-sm sm:text-base">Pending</h4>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-yellow-700">
            KES {stats?.pendingCommission.toFixed(2) || '0.00'}
          </div>
          <p className="text-xs text-yellow-700 mt-2">Awaiting approval</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h4 className="font-bold text-blue-900 text-sm sm:text-base">Total Paid</h4>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-700">
            KES {stats?.paidCommission.toFixed(2) || '0.00'}
          </div>
          <p className="text-xs text-blue-700 mt-2">Lifetime earnings</p>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Payout History</h3>
          <button
            onClick={() => exportToCSV(payouts, 'payout-history')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            Export CSV
          </button>
        </div>
        {payouts.length > 0 ? (
          <div className="space-y-3">
            {payouts.map(payout => (
              <div
                key={payout._id}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        payout.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payout.status.toUpperCase()}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 capitalize">
                        {payout.payout_method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      <span>Requested: {new Date(payout.requested_at).toLocaleDateString()}</span>
                      {payout.completed_at && (
                        <span className="ml-3">
                          • Completed: {new Date(payout.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {payout.conversion_count} conversions included
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      KES {payout.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">No payouts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

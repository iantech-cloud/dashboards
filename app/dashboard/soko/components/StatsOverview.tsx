// app/dashboard/soko/components/StatsOverview.tsx
import { DollarSign, MousePointerClick, Clock, CheckCircle } from 'lucide-react';
import { SokoStats } from '../types';

interface StatsOverviewProps {
  stats: SokoStats;
  onRequestPayout: () => void;
}

export default function StatsOverview({ stats, onRequestPayout }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Total Earnings</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">KES {stats.totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">↑ +{stats.conversionRate.toFixed(1)}% conversion rate</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Total Clicks</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalConversions} conversions</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
            <MousePointerClick className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Pending Commission</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">KES {stats.pendingCommission.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">Available Balance</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">KES {stats.approvedCommission.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={onRequestPayout}>
              Request withdrawal →
            </p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

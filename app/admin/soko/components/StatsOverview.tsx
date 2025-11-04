// app/admin/soko/components/StatsOverview.tsx
import { Clock, DollarSign, Users, Package, TrendingUp, Award } from 'lucide-react';

interface AdminStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalProducts: number;
  totalAffiliates: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  pendingCommissions: number;
  approvedCommissions: number;
  paidCommissions: number;
  pendingPayouts: number;
}

interface StatsOverviewProps {
  stats: AdminStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Pending Payouts</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingPayouts}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-yellow-600 font-medium">KES {stats.pendingCommissions.toFixed(2)}</span>
          <span className="text-gray-500 ml-2">pending</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">KES {stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-green-600 font-medium">↑ {stats.conversionRate.toFixed(1)}%</span>
          <span className="text-gray-500 ml-2">conversion rate</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Affiliates</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAffiliates}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-600">{stats.activeCampaigns} active campaigns</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Products</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-600">{stats.totalClicks.toLocaleString()} total clicks</span>
        </div>
      </div>
    </div>
  );
}

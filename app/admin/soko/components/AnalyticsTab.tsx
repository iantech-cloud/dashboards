// app/admin/soko/components/AnalyticsTab.tsx
import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Package, MousePointerClick, TrendingUp, Users, DollarSign, Award, Clock, Plus, Upload, Download, Loader2 } from 'lucide-react';
import { exportSokoReport } from '@/app/actions/admin/soko';

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

interface Campaign {
  _id: string;
  name: string;
  campaign_type: string;
  commission_type: 'percentage' | 'fixed';
  commission_rate: number;
  commission_fixed_amount: number;
  status: string;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  current_participants: number;
  product_count: number;
}

interface AnalyticsTabProps {
  stats: AdminStats;
  campaigns: Campaign[];
}

export default function AnalyticsTab({ stats, campaigns }: AnalyticsTabProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (reportType: 'campaigns' | 'conversions' | 'payouts' | 'products') => {
    try {
      setIsExporting(true);
      const result = await exportSokoReport(reportType);
      if (result.success && result.data) {
        const blob = new Blob([result.data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Sample chart data - in a real app, you'd fetch this from your API
  const performanceData = [
    { month: 'Jan', clicks: 1200, conversions: 45, revenue: 45000 },
    { month: 'Feb', clicks: 1800, conversions: 67, revenue: 67000 },
    { month: 'Mar', clicks: 2200, conversions: 89, revenue: 89000 },
    { month: 'Apr', clicks: 1900, conversions: 72, revenue: 72000 },
    { month: 'May', clicks: 2500, conversions: 98, revenue: 98000 },
    { month: 'Jun', clicks: 2800, conversions: 112, revenue: 112000 },
  ];

  const topCampaigns = campaigns
    .filter(c => c.status === 'active')
    .sort((a, b) => b.total_conversions - a.total_conversions)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Performance Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="text-2xl font-bold text-green-600">KES {stats.totalRevenue.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div className="text-sm text-gray-600">Active Affiliates</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalAffiliates}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MousePointerClick className="w-5 h-5 text-orange-600" />
              <div className="text-sm text-gray-600">Total Clicks</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.totalClicks.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Commission Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-600" />
                <div>
                  <div className="text-sm text-yellow-700 font-medium">Pending</div>
                  <div className="text-2xl font-bold text-yellow-800">KES {stats.pendingCommissions.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <div>
                  <div className="text-sm text-green-700 font-medium">Approved</div>
                  <div className="text-2xl font-bold text-green-800">KES {stats.approvedCommissions.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-blue-700 font-medium">Paid Out</div>
                  <div className="text-2xl font-bold text-blue-800">KES {stats.paidCommissions.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Performing Campaigns</h3>
          <div className="space-y-3">
            {topCampaigns.map((campaign, index) => (
              <div key={campaign._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-500">
                      {campaign.commission_type === 'percentage' 
                        ? `${campaign.commission_rate}%` 
                        : `KES ${campaign.commission_fixed_amount}`
                      } • {campaign.total_conversions} conversions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{campaign.conversion_rate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">CR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {performanceData.slice(-3).map((month, index) => (
            <div key={month.month} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">{month.month}</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clicks:</span>
                  <span className="font-medium">{month.clicks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversions:</span>
                  <span className="font-medium text-green-600">{month.conversions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Revenue:</span>
                  <span className="font-medium text-blue-600">KES {month.revenue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Simple bar chart visualization */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-32 gap-2">
            {performanceData.map((month, index) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t transition-all hover:from-blue-600 hover:to-blue-700"
                  style={{ height: `${(month.conversions / 120) * 100}%` }}
                  title={`${month.month}: ${month.conversions} conversions`}
                />
                <div className="text-xs text-gray-600 mt-2">{month.month}</div>
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 mt-4">Monthly Conversions</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/soko/create"
            className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">Create Campaign</span>
          </Link>
          <button
            onClick={() => handleExport('campaigns')}
            disabled={isExporting}
            className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span className="font-bold">Export Report</span>
          </button>
          <button
            onClick={() => handleExport('products')}
            disabled={isExporting}
            className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Package className="w-5 h-5" />
            <span className="font-bold">Products CSV</span>
          </button>
          <button
            onClick={() => handleExport('conversions')}
            disabled={isExporting}
            className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold">Conversions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

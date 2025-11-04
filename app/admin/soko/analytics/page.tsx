// app/admin/soko/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  MousePointer, 
  TrendingUp, 
  CreditCard, 
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { getSokoAdminStats, getCampaignAnalytics, exportSokoReport } from '@/app/actions/admin/soko';

interface AnalyticsData {
  campaign: {
    name: string;
    total_clicks: number;
    total_conversions: number;
    conversion_rate: number;
    total_revenue: number;
    total_commission: number;
  };
  clicksByDay: Array<{
    _id: string;
    count: number;
  }>;
  conversionsByDay: Array<{
    _id: string;
    count: number;
    revenue: number;
    commission: number;
  }>;
  topAffiliates: Array<{
    username: string;
    clicks: number;
    conversions: number;
    earnings: number;
    conversion_rate: number;
  }>;
}

interface AdminStats {
  totalCampaigns: number;
  activeCampaigns: number;
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

export default function SokoAnalyticsPage() {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAdminStats();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignAnalytics();
    }
  }, [selectedCampaign, dateRange]);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const result = await getSokoAdminStats();
      
      if (result.success) {
        setAdminStats(result.data);
      } else {
        console.error('Failed to load admin stats:', result.message);
      }
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignAnalytics = async () => {
    try {
      setLoading(true);
      const result = await getCampaignAnalytics(selectedCampaign, {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      });
      
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        console.error('Failed to load analytics:', result.message);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (reportType: 'campaigns' | 'conversions' | 'payouts') => {
    try {
      setExporting(true);
      const result = await exportSokoReport(reportType);
      
      if (result.success) {
        // Create and download CSV file
        const blob = new Blob([result.data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to export report:', result.message);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !adminStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soko Analytics</h1>
          <p className="text-gray-600">Monitor affiliate campaign performance and metrics</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExportReport('campaigns')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export Campaigns'}
          </button>
          <button
            onClick={() => handleExportReport('conversions')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export Conversions'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalCampaigns || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {adminStats?.activeCampaigns || 0} active campaigns
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Affiliates</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalAffiliates || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Active affiliate marketers</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{adminStats?.totalClicks || 0}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <MousePointer className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {adminStats?.conversionRate?.toFixed(1) || 0}% conversion rate
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {adminStats?.totalRevenue?.toFixed(2) || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            KES {adminStats?.paidCommissions?.toFixed(2) || 0} paid out
          </p>
        </div>
      </div>

      {/* Campaign Selection and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Campaign
            </label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Choose a campaign...</option>
              {/* Campaign options would be populated from API */}
              <option value="campaign-1">Sample Campaign 1</option>
              <option value="campaign-2">Sample Campaign 2</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={loadCampaignAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Filter size={16} />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Campaign Analytics */}
      {analyticsData && (
        <div className="space-y-6">
          {/* Campaign Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Campaign Clicks</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.campaign.total_clicks}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.campaign.total_conversions}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.campaign.conversion_rate.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {analyticsData.campaign.total_revenue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Charts and Top Affiliates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clicks Over Time */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clicks Over Time</h3>
              <div className="space-y-3">
                {analyticsData.clicksByDay.map((day) => (
                  <div key={day._id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day._id}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${(day.count / Math.max(...analyticsData.clicksByDay.map(d => d.count))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {day.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Affiliates */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Affiliates</h3>
              <div className="space-y-4">
                {analyticsData.topAffiliates.map((affiliate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{affiliate.username}</p>
                        <p className="text-sm text-gray-500">
                          {affiliate.conversions} conversions • {affiliate.conversion_rate.toFixed(1)}% rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        KES {affiliate.earnings.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">{affiliate.clicks} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conversions Over Time */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversions & Revenue</h3>
            <div className="space-y-4">
              {analyticsData.conversionsByDay.map((day) => (
                <div key={day._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{day._id}</p>
                    <p className="text-sm text-gray-500">{day.count} conversions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      KES {day.revenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      KES {day.commission.toFixed(2)} commission
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyticsData && selectedCampaign && (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            No analytics data available for the selected campaign and date range. 
            Try selecting a different campaign or adjusting your filters.
          </p>
        </div>
      )}

      {/* No Campaign Selected */}
      {!selectedCampaign && (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Campaign</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Choose a campaign from the dropdown above to view detailed analytics and performance metrics.
          </p>
        </div>
      )}
    </div>
  );
}

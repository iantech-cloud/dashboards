// app/dashboard/soko/components/tabs/PerformanceTab.tsx
import { Download, TrendingUp, ShoppingCart, BarChart3, PieChart } from 'lucide-react';
import { PerformanceData, SokoStats } from '../types';
import LineChart from '../charts/LineChart';
import PieChartComponent from '../charts/PieChart';

interface PerformanceTabProps {
  performance: PerformanceData | null;
  stats: SokoStats | null;
  exportToCSV: (data: any[], filename: string) => void;
}

export default function PerformanceTab({ performance, stats, exportToCSV }: PerformanceTabProps) {
  return (
    <div className="space-y-6">
      {/* Top Campaigns */}
      {performance?.topCampaigns && performance.topCampaigns.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Top Performing Campaigns</h3>
            <button
              onClick={() => exportToCSV(performance.topCampaigns, 'top-campaigns')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              Export CSV
            </button>
          </div>
          <div className="space-y-3">
            {performance.topCampaigns.map((campaign, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{campaign.campaign_name}</h4>
                      <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1 flex-wrap">
                        <span>{campaign.clicks} clicks</span>
                        <span>•</span>
                        <span>{campaign.conversions} conversions</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      KES {campaign.earnings.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Total Earned</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Charts */}
      {performance && (performance.clicks.length > 0 || performance.conversions.length > 0) && (
        <div className="space-y-6">
          {/* Clicks Chart */}
          {performance.clicks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Clicks Over Time (Last 30 Days)
              </h3>
              <div className="overflow-x-auto">
                <LineChart data={performance.clicks} dataKey="count" color="#3B82F6" />
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {performance.clicks.reduce((sum, d) => sum + d.count, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Clicks</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {(performance.clicks.reduce((sum, d) => sum + d.count, 0) / performance.clicks.length).toFixed(1)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Avg per Day</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {Math.max(...performance.clicks.map(d => d.count))}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Peak Day</div>
                </div>
              </div>
            </div>
          )}

          {/* Conversions Chart */}
          {performance.conversions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Conversions Over Time (Last 30 Days)
              </h3>
              <div className="overflow-x-auto">
                <LineChart data={performance.conversions} dataKey="count" color="#10B981" />
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {performance.conversions.reduce((sum, d) => sum + d.count, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Conversions</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    KES {performance.conversions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Earned</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {stats ? stats.conversionRate.toFixed(1) : '0'}%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Conv. Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Distribution Pie Chart */}
          {performance.topCampaigns.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Revenue Distribution by Campaign
              </h3>
              <div className="flex justify-center">
                <PieChartComponent 
                  data={performance.topCampaigns.map((campaign, i) => ({
                    name: campaign.campaign_name,
                    value: campaign.earnings,
                    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {(!performance || (performance.clicks.length === 0 && performance.conversions.length === 0 && performance.topCampaigns.length === 0)) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-sm sm:text-base">No performance data available yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Start promoting campaigns to see your analytics</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

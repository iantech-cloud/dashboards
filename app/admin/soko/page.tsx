// app/admin/soko/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Loader2,
  Calendar,
  Package,
  Award,
  Upload,
  FileText,
  X,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import {
  getAllCampaigns,
  getSokoAdminStats,
  getPendingPayouts,
  getPendingConversions,
  deleteCampaign,
  toggleCampaignStatus,
  exportSokoReport,
  uploadAndProcessCSV,
  getImportLogs,
  getAlibabaProducts
} from '@/app/actions/admin/soko';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  slug: string;
  campaign_type: string;
  commission_rate: number;
  status: string;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  current_participants: number;
  product_count: number;
  created_at: string;
  is_featured: boolean;
}

interface PendingPayout {
  _id: string;
  user_id: string;
  username: string;
  amount: number;
  payout_method: string;
  requested_at: string;
  conversion_count: number;
}

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

interface ImportLog {
  _id: string;
  batch_id: string;
  filename: string;
  campaign_name: string;
  total_rows: number;
  processed_rows: number;
  successful_imports: number;
  failed_imports: number;
  status: string;
  created_at: string;
  completed_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminSokoPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [pendingConversions, setPendingConversions] = useState<PendingConversion[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'products' | 'payouts' | 'conversions' | 'analytics'>('campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  
  // CSV Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, campaignsRes, payoutsRes, conversionsRes, logsRes] = await Promise.allSettled([
        getSokoAdminStats(),
        getAllCampaigns(),
        getPendingPayouts(),
        getPendingConversions(),
        getImportLogs(20)
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      }
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success) {
        setCampaigns(campaignsRes.value.data);
      }
      if (payoutsRes.status === 'fulfilled' && payoutsRes.value.success) {
        setPendingPayouts(payoutsRes.value.data);
      }
      if (conversionsRes.status === 'fulfilled' && conversionsRes.value.success) {
        setPendingConversions(conversionsRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value.success) {
        setImportLogs(logsRes.value.data);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const result = await toggleCampaignStatus(campaignId, newStatus);
      if (result.success) loadAllData();
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const result = await deleteCampaign(campaignId);
      if (result.success) {
        loadAllData();
      } else {
        alert(result.message || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

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

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedCampaign) {
      alert('Please select a campaign first');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      setUploadingCSV(true);
      setUploadProgress('Reading file...');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target?.result as string;
        
        setUploadProgress('Uploading and processing...');
        
        const result = await uploadAndProcessCSV({
          csvContent,
          filename: file.name,
          campaignId: selectedCampaign,
          batchSize: 50
        });

        if (result.success) {
          setUploadProgress(`Success! ${result.data.successful} products imported, ${result.data.failed} failed.`);
          setTimeout(() => {
            setShowUploadModal(false);
            setUploadProgress('');
            setSelectedCampaign('');
            loadAllData();
          }, 3000);
        } else {
          setUploadProgress(`Error: ${result.message}`);
        }
      };

      reader.onerror = () => {
        setUploadProgress('Error reading file');
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadProgress('Error uploading file');
    } finally {
      setUploadingCSV(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        <p className="ml-3 text-gray-600">Loading Soko Admin...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Soko Management</h1>
          <p className="text-gray-600 mt-1">Manage affiliate campaigns, products and track performance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload CSV
          </button>
          <button
            onClick={() => handleExport(activeTab === 'campaigns' ? 'campaigns' : activeTab === 'products' ? 'products' : activeTab === 'conversions' ? 'conversions' : 'payouts')}
            disabled={isExporting}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Export
          </button>
          <Link
            href="/admin/soko/create"
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
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
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(['campaigns', 'products', 'payouts', 'conversions', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'campaigns' && <><ShoppingCart className="w-5 h-5" />Campaigns ({campaigns.length})</>}
              {tab === 'products' && <><Package className="w-5 h-5" />Products ({stats?.totalProducts || 0})</>}
              {tab === 'payouts' && <><DollarSign className="w-5 h-5" />Pending Payouts ({pendingPayouts.length})</>}
              {tab === 'conversions' && <><TrendingUp className="w-5 h-5" />Pending Conversions ({pendingConversions.length})</>}
              {tab === 'analytics' && <><BarChart3 className="w-5 h-5" />Analytics</>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* CAMPAIGNS TAB */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCampaigns.map(campaign => (
                      <tr key={campaign._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {campaign.name}
                              {campaign.is_featured && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">FEATURED</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{campaign.slug}</div>
                            {campaign.product_count > 0 && (
                              <div className="text-xs text-purple-600 font-medium mt-1">
                                {campaign.product_count} products
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                            {campaign.campaign_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-green-600">{campaign.commission_rate}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <MousePointerClick className="w-4 h-4 text-gray-400" />
                              <span>{campaign.total_clicks.toLocaleString()} clicks</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                              <span>{campaign.total_conversions} conversions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>{campaign.current_participants} affiliates</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            campaign.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {campaign.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/soko/${campaign._id}/edit`} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Edit">
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(campaign._id, campaign.status)}
                              className={`p-2 rounded transition ${campaign.status === 'active' ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                            >
                              {campaign.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDeleteCampaign(campaign._id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCampaigns.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No campaigns found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Alibaba Products</h3>
                    <p className="text-gray-600">Manage imported products from CSV uploads</p>
                    <div className="mt-4 flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">{stats?.totalProducts || 0}</span>
                        <span className="text-gray-600">Total Products</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload CSV
                  </button>
                </div>
              </div>

              {/* Recent Import Logs */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recent CSV Imports</h3>
                  <button
                    onClick={loadAllData}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                {importLogs.length > 0 ? (
                  <div className="space-y-3">
                    {importLogs.map(log => (
                      <div key={log._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            log.status === 'completed' ? 'bg-green-100' :
                            log.status === 'processing' ? 'bg-blue-100' :
                            log.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              log.status === 'completed' ? 'text-green-600' :
                              log.status === 'processing' ? 'text-blue-600' :
                              log.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{log.filename}</div>
                            <div className="text-sm text-gray-500">
                              Campaign: {log.campaign_name} • {new Date(log.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {log.successful_imports} / {log.total_rows} imported
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.failed_imports > 0 && `${log.failed_imports} failed`}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'completed' ? 'bg-green-100 text-green-700' :
                            log.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No import logs yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PENDING PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              {pendingPayouts.length > 0 ? pendingPayouts.map(payout => (
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
          )}

          {/* PENDING CONVERSIONS TAB */}
          {activeTab === 'conversions' && (
            <div className="space-y-4">
              {pendingConversions.length > 0 ? pendingConversions.map(conversion => (
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
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && stats && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
                <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600 mb-6">Detailed performance analytics and reports</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Avg Conversion Rate</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(2)}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">KES {stats.totalRevenue.toFixed(0)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Active Affiliates</div>
                    <div className="text-2xl font-bold text-purple-600">{stats.totalAffiliates}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Conversions</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.totalConversions}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Commission Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div className="text-sm text-yellow-700 font-medium">Pending</div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-800">KES {stats.pendingCommissions.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div className="text-sm text-green-700 font-medium">Approved</div>
                    </div>
                    <div className="text-2xl font-bold text-green-800">KES {stats.approvedCommissions.toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-6 h-6 text-blue-600" />
                      <div className="text-sm text-blue-700 font-medium">Paid Out</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">KES {stats.paidCommissions.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Campaign Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-900">{stats.activeCampaigns}</div>
                        <div className="text-sm text-blue-700">Active Campaigns</div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600">Out of {stats.totalCampaigns} total campaigns</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <MousePointerClick className="w-8 h-8 text-purple-600" />
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-900">{stats.totalClicks.toLocaleString()}</div>
                        <div className="text-sm text-purple-700">Total Clicks</div>
                      </div>
                    </div>
                    <div className="text-xs text-purple-600">{stats.totalConversions} total conversions</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/admin/soko/create"
                    className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="font-bold">Create Campaign</span>
                  </Link>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="font-bold">Upload Products</span>
                  </button>
                  <button
                    onClick={() => handleExport('campaigns')}
                    disabled={isExporting}
                    className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                    <span className="font-bold">Export Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upload Alibaba Products CSV</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadProgress('');
                  setSelectedCampaign('');
                }}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Campaign *
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns
                    .filter(c => c.status === 'active' || c.status === 'draft')
                    .map(campaign => (
                      <option key={campaign._id} value={campaign._id}>
                        {campaign.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    CSV file with product data
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={uploadingCSV || !selectedCampaign}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCSV || !selectedCampaign}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingCSV ? 'Uploading...' : 'Select File'}
                  </button>
                </div>
              </div>

              {uploadProgress && (
                <div className={`p-4 rounded-lg ${
                  uploadProgress.includes('Success') ? 'bg-green-50 text-green-800' :
                  uploadProgress.includes('Error') ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  <p className="text-sm font-medium">{uploadProgress}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Required CSV Columns:</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <strong>id</strong> - Product ID</p>
                  <p>• <strong>title</strong> - Product title</p>
                  <p>• <strong>description</strong> - Product description</p>
                  <p>• <strong>price</strong> or <strong>price_usd</strong> - Price in USD</p>
                  <p>• <strong>image_url</strong> - Product image URL</p>
                  <p>• <strong>deep_link</strong> - Product URL</p>
                  <p>• <strong>category_name</strong> - Category</p>
                  <p className="text-xs mt-2 text-blue-600">
                    * Column names are case-insensitive
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

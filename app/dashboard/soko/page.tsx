// app/dashboard/soko/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Copy, 
  Share2, 
  ExternalLink, 
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  Search,
  Eye,
  Gift,
  Users,
  BarChart3,
  Calendar,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Percent,
  FileText,
  HelpCircle,
  Bell,
  Settings,
  UserPlus,
  Smartphone,
  Globe,
  Zap,
  X,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import { 
  getSokoStats, 
  getMyCampaigns, 
  generateAffiliateLink,
  getMyPerformance,
  getMyPayouts,
  requestPayout,
  getMyAffiliateLinks,
  getCampaignDetails
} from '@/app/actions/soko';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SokoStats {
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  conversionRate: number;
  averageSaleValue: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

interface Campaign {
  _id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  featured_image: string;
  campaign_type: string;
  commission_rate: number;
  commission_fixed_amount: number;
  commission_type: string;
  product_category: string;
  status: string;
  start_date: string;
  end_date?: string;
  is_featured: boolean;
  product_price?: number;
  currency?: string;
  terms_and_conditions?: string;
  gallery_images?: string[];
}

interface CampaignDetails extends Campaign {
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
}

interface UserAffiliateLink {
  _id: string;
  campaign_id: string;
  campaign_name: string;
  tracking_code: string;
  short_slug?: string;
  full_tracking_url: string;
  short_tracking_url?: string;
  total_clicks: number;
  total_conversions: number;
  total_commission_earned: number;
  conversion_rate: number;
  is_active: boolean;
}

interface PerformanceData {
  clicks: Array<{
    date: string;
    count: number;
  }>;
  conversions: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  topCampaigns: Array<{
    campaign_name: string;
    clicks: number;
    conversions: number;
    earnings: number;
  }>;
}

interface Payout {
  _id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  conversion_count: number;
}

// ============================================================================
// CHART COMPONENTS
// ============================================================================

const LineChart = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, 1); // Ensure max is at least 1 to avoid division by zero
  const height = 200;
  const width = 600;
  const padding = 40;
  
  // Handle single data point case
  if (data.length === 1) {
    const x = width / 2;
    const y = height - padding - ((values[0] / max) * (height - 2 * padding));
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <circle cx={x} cy={y} r="4" fill={color} />
      </svg>
    );
  }
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d[dataKey] || 0) / max) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d[dataKey] || 0) / max) * (height - 2 * padding);
        // Ensure x and y are valid numbers
        if (isNaN(x) || isNaN(y)) return null;
        return (
          <circle key={i} cx={x} cy={y} r="4" fill={color} />
        );
      })}
    </svg>
  );
};

const PieChart = ({ data }: { data: Array<{ name: string, value: number, color: string }> }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total === 0) return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-500">No data to display</p>
    </div>
  );
  
  const size = 200;
  const center = size / 2;
  const radius = 80;
  let cumulativePercent = 0;
  
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = startPercent * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPercent * 2 * Math.PI - Math.PI / 2;
    
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    
    const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;
    
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const percent = d.value / total;
          const startPercent = cumulativePercent;
          const endPercent = cumulativePercent + percent;
          cumulativePercent = endPercent;
          
          return (
            <path
              key={i}
              d={createArc(startPercent, endPercent)}
              fill={d.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={center} cy={center} r="50" fill="white" />
        <text 
          x={center} 
          y={center} 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="text-lg font-bold fill-gray-700"
        >
          {data.length}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-700 truncate max-w-[200px]">{d.name}</span>
            <span className="text-sm font-semibold text-gray-900 ml-auto">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SokoPage() {
  const [stats, setStats] = useState<SokoStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<UserAffiliateLink[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'links' | 'performance' | 'payouts' | 'referrals'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetails | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, campaignsRes, linksRes, performanceRes, payoutsRes] = await Promise.allSettled([
        getSokoStats(),
        getMyCampaigns(),
        getMyAffiliateLinks(),
        getMyPerformance(),
        getMyPayouts(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      }

      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success) {
        setCampaigns(campaignsRes.value.data);
      }

      if (linksRes.status === 'fulfilled' && linksRes.value.success) {
        setMyLinks(linksRes.value.data);
      }

      if (performanceRes.status === 'fulfilled' && performanceRes.value.success) {
        setPerformance(performanceRes.value.data);
      }

      if (payoutsRes.status === 'fulfilled' && payoutsRes.value.success) {
        setPayouts(payoutsRes.value.data);
      }

    } catch (err) {
      console.error('Error loading Soko data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async (campaignId: string) => {
    try {
      const result = await generateAffiliateLink(campaignId);
      if (result.success) {
        setMyLinks(prev => [...prev, result.data]);
        setCopyMessage('Link generated successfully!');
        setTimeout(() => setCopyMessage(''), 3000);
      } else {
        setCopyMessage(result.message || 'Failed to generate link');
        setTimeout(() => setCopyMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      setCopyMessage('Failed to generate link');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('Link copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch (error) {
      setCopyMessage('Failed to copy link');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  };

  const handleViewCampaign = async (campaignId: string) => {
    try {
      setLoadingCampaign(true);
      const result = await getCampaignDetails(campaignId);
      if (result.success) {
        setSelectedCampaign(result.data);
      } else {
        setCopyMessage('Failed to load campaign details');
        setTimeout(() => setCopyMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      setCopyMessage('Failed to load campaign details');
      setTimeout(() => setCopyMessage(''), 3000);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!stats || stats.approvedCommission < 500) {
      alert('Minimum payout amount is KES 500. Payouts are processed by admin.');
      return;
    }

    try {
      const result = await requestPayout({
        amount: stats.approvedCommission,
        payout_method: 'mpesa'
      });

      if (result.success) {
        alert('Payout requested successfully! Admin will process your request.');
        const [statsRes, payoutsRes] = await Promise.all([
          getSokoStats(),
          getMyPayouts()
        ]);
        
        if (statsRes.success) setStats(statsRes.data);
        if (payoutsRes.success) setPayouts(payoutsRes.data);
      } else {
        alert(result.message || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      alert('Failed to request payout');
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesCategory = filterCategory === 'all' || campaign.product_category === filterCategory;
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(campaigns.map(c => c.product_category))).filter(Boolean);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Smartphone className="w-4 h-4" />;
      case 'desktop': return <Globe className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  // Generate unique referral link
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/soko?ref=${stats?.totalClicks || 'YOUR_CODE'}` 
    : '/soko?ref=YOUR_CODE';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        <p className="ml-3 text-gray-600">Loading Soko...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm sm:text-base">{error}</p>
          </div>
          <button
            onClick={loadAllData}
            className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">Soko Affiliate Dashboard</h1>
        <p className="text-blue-100 text-sm sm:text-base">Promote products and earn commissions</p>
      </div>

      {/* Stats Overview */}
      {stats && (
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
                <p className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={handleRequestPayout}>
                  Request withdrawal →
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {copyMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg animate-slideIn z-50 text-sm sm:text-base">
          {copyMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'campaigns'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Available Campaigns</span>
            <span className="sm:hidden">Campaigns</span>
            <span className="text-xs">({campaigns.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'links'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">My Links</span>
            <span className="sm:hidden">Links</span>
            <span className="text-xs">({myLinks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'performance'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'payouts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Payouts</span>
            <span className="sm:hidden">Pay</span>
            <span className="text-xs">({payouts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'referrals'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            Referrals
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* CAMPAIGNS TAB */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredCampaigns.map(campaign => {
                  const hasLink = myLinks.some(link => link.campaign_id === campaign._id);
                  
                  return (
                    <div
                      key={campaign._id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {campaign.is_featured && (
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold">
                          ⭐ FEATURED
                        </div>
                      )}

                      {campaign.featured_image ? (
                        <img
                          src={campaign.featured_image}
                          alt={campaign.name}
                          className="w-full h-40 sm:h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <Gift className="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-50" />
                        </div>
                      )}

                      <div className="p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                          {campaign.name}
                        </h3>

                        <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-3">
                          {campaign.short_description || campaign.description}
                        </p>

                            <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 rounded-full">
			  {campaign.commission_type === 'percentage' ? (
			    <>
			      <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
			      <span className="text-xs sm:text-sm font-bold text-green-700">
				{campaign.commission_rate}% Commission
			      </span>
			    </>
			  ) : (
			    <>
			      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
			      <span className="text-xs sm:text-sm font-bold text-green-700">
				{/* CHANGE THIS LINE: */}
				KES {campaign.commission_fixed_amount || campaign.commission_rate} Fixed
			      </span>
			    </>
			  )}
			</div>

                        <div className="mb-4">
                          <span className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {campaign.product_category}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {hasLink ? (
                            <button
                              onClick={() => {
                                setActiveTab('links');
                                const link = myLinks.find(l => l.campaign_id === campaign._id);
                                if (link) handleCopyLink(link.full_tracking_url);
                              }}
                              className="w-full py-2 px-4 bg-green-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                              Copy My Link
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateLink(campaign._id)}
                              className="w-full py-2 px-4 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                              <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              Get Affiliate Link
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleViewCampaign(campaign._id)}
                            className="w-full py-2 px-4 border border-gray-300 text-gray-700 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCampaigns.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm sm:text-base">No campaigns found</p>
                </div>
              )}
            </div>
          )}

          {/* MY LINKS TAB */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">My Affiliate Links</h3>
                <button
                  onClick={() => exportToCSV(myLinks, 'affiliate-links')}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  Export CSV
                </button>
              </div>

              {myLinks.length > 0 ? (
                myLinks.map(link => (
                  <div
                    key={link._id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                          {link.campaign_name}
                        </h3>
                        
                        <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 flex items-center gap-2">
                          <code className="text-xs sm:text-sm text-blue-600 flex-1 truncate break-all">
                            {link.full_tracking_url}
                          </code>
                          <button
                            onClick={() => handleCopyLink(link.full_tracking_url)}
                            className="p-2 hover:bg-gray-100 rounded transition flex-shrink-0"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => window.open(link.full_tracking_url, '_blank')}
                            className="p-2 hover:bg-gray-100 rounded transition flex-shrink-0"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        {link.short_tracking_url && (
                          <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 flex items-center gap-2">
                            <span className="text-xs text-gray-600 flex-shrink-0">Short URL:</span>
                            <code className="text-xs sm:text-sm text-purple-600 flex-1 truncate">
                              {link.short_tracking_url}
                            </code>
                            <button
                              onClick={() => handleCopyLink(link.short_tracking_url)}
                              className="p-2 hover:bg-gray-100 rounded transition flex-shrink-0"
                            >
                              <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-lg sm:text-2xl font-bold text-blue-600">{link.total_clicks}</div>
                            <div className="text-xs text-gray-600">Clicks</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-lg sm:text-2xl font-bold text-green-600">{link.total_conversions}</div>
                            <div className="text-xs text-gray-600">Conversions</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-lg sm:text-2xl font-bold text-purple-600">
                              {link.conversion_rate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">Conv. Rate</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                              KES {link.total_commission_earned.toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-600">Earned</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      {link.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <LinkIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">No affiliate links yet</p>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition"
                  >
                    Browse Campaigns
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
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
                        <PieChart 
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
          )}

          {/* PAYOUTS TAB */}
          {activeTab === 'payouts' && (
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
                    onClick={handleRequestPayout}
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
          )}

          {/* REFERRALS TAB */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Your Affiliate Referral Link</h3>
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Share your unique referral link to invite others to join Soko affiliate program!
                </p>
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm mb-1">Your Referral Link</p>
                      <code className="text-xs sm:text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded block truncate">
                        {referralLink}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopyLink(referralLink)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-xs text-gray-600">Referrals</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="text-2xl font-bold text-green-600">KES 0</div>
                    <div className="text-xs text-gray-600">Referral Earnings</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="text-2xl font-bold text-blue-600">10%</div>
                    <div className="text-xs text-gray-600">Commission Rate</div>
                  </div>
                </div>
              </div>

              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm sm:text-base mb-2">Start inviting affiliates today!</p>
                <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto px-4">
                  Invite other affiliates and earn 10% of their commissions for the first 3 months.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            {loadingCampaign ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                <p className="ml-3 text-gray-600">Loading campaign details...</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-4">{selectedCampaign.name}</h2>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {selectedCampaign.featured_image && (
                  <img
                    src={selectedCampaign.featured_image}
                    alt={selectedCampaign.name}
                    className="w-full h-48 sm:h-64 object-cover rounded-xl mb-4"
                  />
                )}

                {/* Gallery Images */}
                {selectedCampaign.gallery_images && selectedCampaign.gallery_images.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Gallery</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedCampaign.gallery_images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Gallery ${i + 1}`}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaign Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Description</h3>
                    <div className="prose max-w-none text-sm sm:text-base text-gray-700">
                      <p>{selectedCampaign.description}</p>
                    </div>
                  </div>

                  {/* Commission & Category Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="text-xs sm:text-sm text-green-700 mb-1">Commission</div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600 flex items-center gap-2">
                        {selectedCampaign.commission_type === 'percentage' ? (
                          <>
                            <Percent className="w-5 h-5" />
                            {selectedCampaign.commission_rate}%
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-5 h-5" />
                            KES {selectedCampaign.commission_fixed_amount || selectedCampaign.commission_rate}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-green-600 mt-1 capitalize">
                        {selectedCampaign.commission_type}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="text-xs sm:text-sm text-blue-700 mb-1">Category</div>
                      <div className="text-base sm:text-lg font-bold text-blue-900 mt-2">
                        {selectedCampaign.product_category}
                      </div>
                    </div>

                    {selectedCampaign.product_price && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <div className="text-xs sm:text-sm text-purple-700 mb-1">Product Price</div>
                        <div className="text-xl sm:text-2xl font-bold text-purple-600">
                          {selectedCampaign.currency || 'KES'} {selectedCampaign.product_price.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campaign Period */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Campaign Period</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-600">Start Date:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {selectedCampaign.start_date 
				? new Date(selectedCampaign.start_date).toLocaleDateString('en-US', { 
				    year: 'numeric', 
				    month: 'long', 
				    day: 'numeric' 
				  })
				: 'Not set'}
                        </span>
                      </div>
                      {selectedCampaign.end_date && (
                        <div>
                          <span className="text-gray-600">End Date:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(selectedCampaign.end_date).toLocaleDateString('en-US', { 
				  year: 'numeric', 
				  month: 'long', 
				  day: 'numeric' 
				})}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  {selectedCampaign.terms_and_conditions && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-yellow-600" />
                        <h4 className="font-semibold text-yellow-900 text-sm sm:text-base">Terms & Conditions</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-yellow-800 whitespace-pre-wrap">
                        {selectedCampaign.terms_and_conditions}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedCampaign.tags && selectedCampaign.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCampaign.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                  {myLinks.some(link => link.campaign_id === selectedCampaign._id) ? (
                    <button
                      onClick={() => {
                        const link = myLinks.find(l => l.campaign_id === selectedCampaign._id);
                        if (link) {
                          handleCopyLink(link.full_tracking_url);
                          setSelectedCampaign(null);
                        }
                      }}
                      className="flex-1 py-3 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Copy className="w-4 h-4" />
                      Copy My Link
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleGenerateLink(selectedCampaign._id);
                        setSelectedCampaign(null);
                      }}
                      className="flex-1 py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Get Affiliate Link
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { 
  getSokoStats, 
  getMyCampaigns, 
  generateAffiliateLink,
  getMyPerformance,
  getMyPayouts,
  requestPayout,
  getMyAffiliateLinks
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
  commission_type: string;
  product_category: string;
  status: string;
  start_date: string;
  end_date?: string;
  is_featured: boolean;
}

interface UserAffiliateLink {
  _id: string;
  campaign_id: string;
  campaign_name: string;
  tracking_code: string;
  short_slug?: string;
  full_tracking_url: string;
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

interface ClickLog {
  _id: string;
  clicked_at: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  country?: string;
  city?: string;
  referrer_url?: string;
  status: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SokoPage() {
  // State Management
  const [stats, setStats] = useState<SokoStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<UserAffiliateLink[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [clickLogs, setClickLogs] = useState<ClickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'links' | 'performance' | 'payouts' | 'clicks' | 'referrals' | 'support'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [copyMessage, setCopyMessage] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    newCampaigns: true,
    payoutUpdates: true,
    performanceAlerts: true,
    weeklyReports: false
  });

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // FIXED: Removed the recursive call issue
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call all data fetching functions in parallel
      const [statsRes, campaignsRes, linksRes, performanceRes, payoutsRes] = await Promise.allSettled([
        getSokoStats(),
        getMyCampaigns(),
        getMyAffiliateLinks(),
        getMyPerformance(),
        getMyPayouts(),
      ]);

      // Handle stats
      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats(statsRes.value.data);
      } else {
        console.error('Failed to load stats');
      }

      // Handle campaigns
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success) {
        setCampaigns(campaignsRes.value.data);
      } else {
        console.error('Failed to load campaigns');
      }

      // Handle affiliate links
      if (linksRes.status === 'fulfilled' && linksRes.value.success) {
        setMyLinks(linksRes.value.data);
      } else {
        console.error('Failed to load affiliate links');
      }

      // Handle performance
      if (performanceRes.status === 'fulfilled' && performanceRes.value.success) {
        setPerformance(performanceRes.value.data);
      } else {
        console.error('Failed to load performance');
      }

      // Handle payouts
      if (payoutsRes.status === 'fulfilled' && payoutsRes.value.success) {
        setPayouts(payoutsRes.value.data);
      } else {
        console.error('Failed to load payouts');
      }

      // Simulate click logs data
      setClickLogs([
        {
          _id: '1',
          clicked_at: new Date().toISOString(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          device_type: 'desktop',
          country: 'Kenya',
          city: 'Nairobi',
          referrer_url: 'https://facebook.com',
          status: 'converted'
        },
        {
          _id: '2',
          clicked_at: new Date(Date.now() - 86400000).toISOString(),
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          device_type: 'mobile',
          country: 'Kenya',
          city: 'Mombasa',
          referrer_url: 'https://twitter.com',
          status: 'pending'
        }
      ]);

    } catch (err) {
      console.error('Error loading Soko data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Generate affiliate link
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

  // Copy link to clipboard
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

  // Request payout
  const handleRequestPayout = async () => {
    if (!stats || stats.approvedCommission < 100) {
      alert('Minimum payout amount is KES 100');
      return;
    }

    try {
      const result = await requestPayout({
        amount: stats.approvedCommission,
        payout_method: 'mpesa'
      });

      if (result.success) {
        alert('Payout requested successfully!');
        // Reload only the necessary data
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

  // Export to CSV
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

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesCategory = filterCategory === 'all' || campaign.product_category === filterCategory;
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = Array.from(new Set(campaigns.map(c => c.product_category))).filter(Boolean);

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Smartphone className="w-4 h-4" />;
      case 'desktop': return <Globe className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        <p className="ml-3 text-gray-600">Loading Soko...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Soko Affiliate Dashboard</h1>
        <p className="text-blue-100">Promote products and earn commissions</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">KES {stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">↑ +{stats.conversionRate.toFixed(1)}% conversion rate</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Clicks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalConversions} conversions</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MousePointerClick className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Commission</p>
                <p className="text-2xl font-bold text-gray-900">KES {stats.pendingCommission.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">KES {stats.approvedCommission.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1 cursor-pointer" onClick={handleRequestPayout}>
                  Request withdrawal →
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Message Alert */}
      {copyMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slideIn z-50">
          {copyMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gift className="w-5 h-5" />
            Available Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'links'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="w-5 h-5" />
            My Links ({myLinks.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payouts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Payouts ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('clicks')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'clicks'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MousePointerClick className="w-5 h-5" />
            Click Logs ({clickLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-5 h-5" />
            Referrals
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'support'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            Support
          </button>
        </div>

        <div className="p-6">
          {/* CAMPAIGNS TAB */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              {/* Search and Filters */}
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
                <div className="flex gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campaign Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map(campaign => {
                  const hasLink = myLinks.some(link => link.campaign_id === campaign._id);
                  
                  return (
                    <div
                      key={campaign._id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {/* Featured Badge */}
                      {campaign.is_featured && (
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 text-xs font-bold">
                          ⭐ FEATURED
                        </div>
                      )}

                      {/* Campaign Image */}
                      {campaign.featured_image ? (
                        <img
                          src={campaign.featured_image}
                          alt={campaign.name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <Gift className="w-16 h-16 text-white opacity-50" />
                        </div>
                      )}

                      <div className="p-5">
                        {/* Campaign Name */}
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                          {campaign.name}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {campaign.short_description || campaign.description}
                        </p>

                        {/* Commission Info */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                            <Percent className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-bold text-green-700">
                              {campaign.commission_rate}% Commission
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 capitalize">
                            {campaign.commission_type}
                          </span>
                        </div>

                        {/* Category Badge */}
                        <div className="mb-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {campaign.product_category}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          {hasLink ? (
                            <button
                              onClick={() => {
                                setActiveTab('links');
                                const link = myLinks.find(l => l.campaign_id === campaign._id);
                                if (link) handleCopyLink(link.full_tracking_url);
                              }}
                              className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copy My Link
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateLink(campaign._id)}
                              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Get Affiliate Link
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedCampaign(campaign)}
                            className="w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
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
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No campaigns found</p>
                </div>
              )}
            </div>
          )}

          {/* MY LINKS TAB */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">My Affiliate Links</h3>
                <button
                  onClick={() => exportToCSV(myLinks, 'affiliate-links')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {myLinks.length > 0 ? (
                myLinks.map(link => (
                  <div
                    key={link._id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Link Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {link.campaign_name}
                        </h3>
                        
                        {/* Tracking URL */}
                        <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 flex items-center gap-2">
                          <code className="text-sm text-blue-600 flex-1 truncate">
                            {link.full_tracking_url}
                          </code>
                          <button
                            onClick={() => handleCopyLink(link.full_tracking_url)}
                            className="p-2 hover:bg-gray-100 rounded transition"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => window.open(link.full_tracking_url, '_blank')}
                            className="p-2 hover:bg-gray-100 rounded transition"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        {/* Short Slug */}
                        {link.short_slug && (
                          <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 flex items-center gap-2">
                            <span className="text-xs text-gray-600">Short URL:</span>
                            <code className="text-sm text-purple-600 flex-1">
                              {typeof window !== 'undefined' ? `${window.location.origin}/r/${link.short_slug}` : `/r/${link.short_slug}`}
                            </code>
                            <button
                              onClick={() => handleCopyLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${link.short_slug}`)}
                              className="p-2 hover:bg-gray-100 rounded transition"
                            >
                              <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}

                        {/* Performance Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-2xl font-bold text-blue-600">{link.total_clicks}</div>
                            <div className="text-xs text-gray-600">Clicks</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-2xl font-bold text-green-600">{link.total_conversions}</div>
                            <div className="text-xs text-gray-600">Conversions</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-2xl font-bold text-purple-600">
                              {link.conversion_rate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">Conv. Rate</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-2xl font-bold text-yellow-600">
                              KES {link.total_commission_earned.toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-600">Earned</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
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
                  <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No affiliate links yet</p>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Top Performing Campaigns</h3>
                    <button
                      onClick={() => exportToCSV(performance.topCampaigns, 'top-campaigns')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                  <div className="space-y-3">
                    {performance.topCampaigns.map((campaign, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{campaign.campaign_name}</h4>
                              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                <span>{campaign.clicks} clicks</span>
                                <span>•</span>
                                <span>{campaign.conversions} conversions</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
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

              {/* Charts Placeholder */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Overview</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p>Performance charts coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {/* Payout Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h4 className="font-bold text-green-900">Available Balance</h4>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    KES {stats?.approvedCommission.toFixed(2) || '0.00'}
                  </div>
                  <button
                    onClick={handleRequestPayout}
                    disabled={!stats || stats.approvedCommission < 100}
                    className="mt-4 w-full py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request Payout
                  </button>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <h4 className="font-bold text-yellow-900">Pending</h4>
                  </div>
                  <div className="text-3xl font-bold text-yellow-700">
                    KES {stats?.pendingCommission.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">Awaiting approval</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <h4 className="font-bold text-blue-900">Total Paid</h4>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    KES {stats?.paidCommission.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Lifetime earnings</p>
                </div>
              </div>

              {/* Payout History */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Payout History</h3>
                  <button
                    onClick={() => exportToCSV(payouts, 'payout-history')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                {payouts.length > 0 ? (
                  <div className="space-y-3">
                    {payouts.map(payout => (
                      <div
                        key={payout._id}
                        className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                                payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                payout.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {payout.status.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600 capitalize">
                                {payout.payout_method.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
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
                            <div className="text-2xl font-bold text-gray-900">
                              KES {payout.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No payouts yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CLICK LOGS TAB */}
          {activeTab === 'clicks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Click Logs</h3>
                <button
                  onClick={() => exportToCSV(clickLogs, 'click-logs')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {clickLogs.length > 0 ? (
                <div className="space-y-3">
                  {clickLogs.map(log => (
                    <div
                      key={log._id}
                      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getDeviceIcon(log.device_type)}
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {log.ip_address}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                log.status === 'converted' ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.clicked_at).toLocaleString()} • {log.device_type}
                              {log.country && ` • ${log.city || log.country}`}
                            </div>
                            {log.referrer_url && (
                              <div className="text-xs text-blue-600 mt-1 truncate max-w-md">
                                From: {log.referrer_url}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <MousePointerClick className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No click logs yet</p>
                </div>
              )}
            </div>
          )}

          {/* REFERRALS TAB */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserPlus className="w-8 h-8 text-purple-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Referral Program</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Invite other affiliates and earn 10% of their commissions for the first 3 months!
                </p>
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Your Referral Link</p>
                      <code className="text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {typeof window !== 'undefined' ? `${window.location.origin}/register?ref=your-code` : '/register?ref=your-code'}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopyLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=your-code`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Referral program coming soon</p>
                <p className="text-sm text-gray-500 mt-2">Invite friends and earn extra commissions</p>
              </div>
            </div>
          )}

          {/* SUPPORT TAB */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              {/* Help Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Documentation</h3>
                  <p className="text-gray-600 mb-4">
                    Learn how to maximize your earnings with our comprehensive guides.
                  </p>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Guides →
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <HelpCircle className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">FAQ</h3>
                  <p className="text-gray-600 mb-4">
                    Find answers to commonly asked questions about the affiliate program.
                  </p>
                  <button className="text-green-600 hover:text-green-700 font-medium">
                    Browse FAQ →
                  </button>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-xl font-bold text-gray-900">Notification Preferences</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(notificationPrefs).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {key === 'email' && 'Receive email notifications'}
                          {key === 'newCampaigns' && 'Get notified about new campaigns'}
                          {key === 'payoutUpdates' && 'Updates about your payouts'}
                          {key === 'performanceAlerts' && 'Performance alerts and insights'}
                          {key === 'weeklyReports' && 'Weekly performance reports'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotificationPrefs(prev => ({
                          ...prev,
                          [key]: !value
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Need Help?</h3>
                <p className="text-gray-600 mb-4">
                  Our support team is here to help you succeed with your affiliate marketing.
                </p>
                <div className="flex gap-3">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Contact Support
                  </button>
                  <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                    Live Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedCampaign.name}</h2>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {selectedCampaign.featured_image && (
                <img
                  src={selectedCampaign.featured_image}
                  alt={selectedCampaign.name}
                  className="w-full h-64 object-cover rounded-xl mb-4"
                />
              )}

              <div className="prose max-w-none">
                <p className="text-gray-700">{selectedCampaign.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Commission Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedCampaign.commission_rate}%
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedCampaign.product_category}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    handleGenerateLink(selectedCampaign._id);
                    setSelectedCampaign(null);
                  }}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Get Affiliate Link
                </button>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

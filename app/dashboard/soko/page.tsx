// app/dashboard/soko/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { 
  getSokoStats, 
  getMyCampaigns, 
  getMyAffiliateLinks,
  getMyPerformance,
  getMyPayouts,
  getCampaignProducts,
  getProductDetails,
  generateAffiliateLink,
  requestPayout,
  getCampaignDetails
} from '@/app/actions/soko';
import { SokoStats, Campaign, UserAffiliateLink, PerformanceData, Payout, Product, ProductDetails } from './types';
import DashboardHeader from './components/DashboardHeader';
import StatsOverview from './components/StatsOverview';
import NavigationTabs from './components/NavigationTabs';
import CampaignsTab from './components/tabs/CampaignsTab';
import ProductsTab from './components/tabs/ProductsTab';
import LinksTab from './components/tabs/LinksTab';
import PerformanceTab from './components/tabs/PerformanceTab';
import PayoutsTab from './components/tabs/PayoutsTab';
import ReferralsTab from './components/tabs/ReferralsTab';
import CampaignModal from './components/modals/CampaignModal';
import ProductModal from './components/modals/ProductModal';
import CopyMessage from './components/CopyMessage';

export default function SokoPage() {
  const [stats, setStats] = useState<SokoStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<UserAffiliateLink[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [campaignProducts, setCampaignProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'products' | 'links' | 'performance' | 'payouts' | 'referrals'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [selectedCampaignForProducts, setSelectedCampaignForProducts] = useState<string>('');

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

  const loadCampaignProducts = async (campaignId: string, page: number = 1) => {
    try {
      setLoadingProducts(true);
      setSelectedCampaignForProducts(campaignId);
      const result = await getCampaignProducts(campaignId, {
        search: productSearchQuery,
        page,
        limit: 12
      });
      
      if (result.success) {
        setCampaignProducts(result.data.products);
        setProductsPage(result.data.pagination.page);
        setProductsTotalPages(result.data.pagination.totalPages);
      } else {
        setCopyMessage('Failed to load products');
        setTimeout(() => setCopyMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setCopyMessage('Failed to load products');
      setTimeout(() => setCopyMessage(''), 3000);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleViewProduct = async (productId: string) => {
    try {
      setLoadingCampaign(true);
      const result = await getProductDetails(productId);
      if (result.success) {
        setSelectedProduct(result.data);
      } else {
        setCopyMessage('Failed to load product details');
        setTimeout(() => setCopyMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setCopyMessage('Failed to load product details');
      setTimeout(() => setCopyMessage(''), 3000);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleBrowseProducts = async (campaignId: string) => {
    setSelectedCampaign(null);
    setActiveTab('products');
    await loadCampaignProducts(campaignId);
  };

  const handleGenerateLink = async (campaignId: string, productId?: string) => {
    try {
      const result = await generateAffiliateLink(campaignId, productId);
      if (result.success) {
        setMyLinks(prev => [...prev, result.data]);
        setCopyMessage(productId ? 'Product link generated!' : 'Campaign link generated!');
        setTimeout(() => setCopyMessage(''), 3000);
        
        if (productId && selectedProduct) {
          setSelectedProduct(null);
        }
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

      <DashboardHeader />
      
      {stats && (
        <StatsOverview 
          stats={stats} 
          onRequestPayout={handleRequestPayout}
        />
      )}

      <CopyMessage message={copyMessage} />

      <NavigationTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        campaignsCount={campaigns.length}
        linksCount={myLinks.length}
        payoutsCount={payouts.length}
        productsCount={campaignProducts.length}
      />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          {activeTab === 'campaigns' && (
            <CampaignsTab
              campaigns={campaigns}
              myLinks={myLinks}
              onGenerateLink={handleGenerateLink}
              onCopyLink={handleCopyLink}
              onViewCampaign={handleViewCampaign}
              onBrowseProducts={handleBrowseProducts}
            />
          )}

          {activeTab === 'products' && (
            <ProductsTab
              campaignProducts={campaignProducts}
              loadingProducts={loadingProducts}
              productSearchQuery={productSearchQuery}
              setProductSearchQuery={setProductSearchQuery}
              viewMode={viewMode}
              setViewMode={setViewMode}
              productsPage={productsPage}
              productsTotalPages={productsTotalPages}
              selectedCampaignForProducts={selectedCampaignForProducts}
              myLinks={myLinks}
              onLoadCampaignProducts={loadCampaignProducts}
              onViewProduct={handleViewProduct}
              onCopyLink={handleCopyLink}
              onGenerateLink={handleGenerateLink}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'links' && (
            <LinksTab
              myLinks={myLinks}
              onCopyLink={handleCopyLink}
              exportToCSV={exportToCSV}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab
              performance={performance}
              stats={stats}
              exportToCSV={exportToCSV}
            />
          )}

          {activeTab === 'payouts' && (
            <PayoutsTab
              stats={stats}
              payouts={payouts}
              onRequestPayout={handleRequestPayout}
              exportToCSV={exportToCSV}
            />
          )}

          {activeTab === 'referrals' && (
            <ReferralsTab
              stats={stats}
              onCopyLink={handleCopyLink}
            />
          )}
        </div>
      </div>

      {selectedCampaign && (
        <CampaignModal
          campaign={selectedCampaign}
          loading={loadingCampaign}
          myLinks={myLinks}
          onClose={() => setSelectedCampaign(null)}
          onCopyLink={handleCopyLink}
          onGenerateLink={handleGenerateLink}
          onBrowseProducts={handleBrowseProducts}
        />
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          loading={loadingCampaign}
          myLinks={myLinks}
          onClose={() => setSelectedProduct(null)}
          onCopyLink={handleCopyLink}
          onGenerateLink={handleGenerateLink}
        />
      )}
    </div>
  );
}

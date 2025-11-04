// app/dashboard/soko/components/NavigationTabs.tsx
import { Gift, Package, LinkIcon, BarChart3, DollarSign, UserPlus } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: 'campaigns' | 'products' | 'links' | 'performance' | 'payouts' | 'referrals';
  setActiveTab: (tab: 'campaigns' | 'products' | 'links' | 'performance' | 'payouts' | 'referrals') => void;
  campaignsCount: number;
  linksCount: number;
  payoutsCount: number;
  productsCount: number;
}

export default function NavigationTabs({
  activeTab,
  setActiveTab,
  campaignsCount,
  linksCount,
  payoutsCount,
  productsCount
}: NavigationTabsProps) {
  return (
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
          <span className="text-xs">({campaignsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
            activeTab === 'products'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          Products
          <span className="text-xs">({productsCount})</span>
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
          <span className="text-xs">({linksCount})</span>
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
          <span className="text-xs">({payoutsCount})</span>
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
    </div>
  );
}

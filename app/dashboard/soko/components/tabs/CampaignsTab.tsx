// app/dashboard/soko/components/tabs/CampaignsTab.tsx
import { useState } from 'react';
import { Search, Gift, Percent, DollarSign, Package, ShoppingBag, Eye } from 'lucide-react';
import { Campaign, UserAffiliateLink } from '../types';

interface CampaignsTabProps {
  campaigns: Campaign[];
  myLinks: UserAffiliateLink[];
  onGenerateLink: (campaignId: string, productId?: string) => void;
  onCopyLink: (url: string) => void;
  onViewCampaign: (campaignId: string) => void;
  onBrowseProducts: (campaignId: string) => void;
}

export default function CampaignsTab({
  campaigns,
  myLinks,
  onGenerateLink,
  onCopyLink,
  onViewCampaign,
  onBrowseProducts
}: CampaignsTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesCategory = filterCategory === 'all' || campaign.product_category === filterCategory;
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(campaigns.map(c => c.product_category))).filter(Boolean);

  return (
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

                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 rounded-full">
                    {campaign.commission_type === 'percentage' ? (
                      <>
                        <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-bold text-green-700">
                          {campaign.commission_rate}%
                        </span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-bold text-green-700">
                          KES {campaign.commission_fixed_amount || campaign.commission_rate}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {campaign.product_count > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                      <Package className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">
                        {campaign.product_count} products
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <span className="inline-block px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {campaign.product_category}
                  </span>
                </div>

                <div className="space-y-2">
                  {campaign.product_count > 0 && (
                    <button
                      onClick={() => onBrowseProducts(campaign._id)}
                      className="w-full py-2 px-4 bg-purple-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                      Browse Products
                    </button>
                  )}
                  
                  <button
                    onClick={() => onViewCampaign(campaign._id)}
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
          <Gift className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">No campaigns found</p>
        </div>
      )}
    </div>
  );
}

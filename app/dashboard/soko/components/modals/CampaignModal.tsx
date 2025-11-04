// app/dashboard/soko/components/modals/CampaignModal.tsx
import { X, Calendar, FileText, Percent, DollarSign, Package, LinkIcon, Copy, Loader2 } from 'lucide-react';
import { Campaign, UserAffiliateLink } from '../types';

interface CampaignModalProps {
  campaign: Campaign;
  loading: boolean;
  myLinks: UserAffiliateLink[];
  onClose: () => void;
  onCopyLink: (url: string) => void;
  onGenerateLink: (campaignId: string, productId?: string) => void;
  onBrowseProducts: (campaignId: string) => void;
}

export default function CampaignModal({
  campaign,
  loading,
  myLinks,
  onClose,
  onCopyLink,
  onGenerateLink,
  onBrowseProducts
}: CampaignModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            <p className="ml-3 text-gray-600">Loading campaign details...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-4">{campaign.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {campaign.featured_image && (
              <img
                src={campaign.featured_image}
                alt={campaign.name}
                className="w-full h-48 sm:h-64 object-cover rounded-xl mb-4"
              />
            )}

            {/* Gallery Images */}
            {campaign.gallery_images && campaign.gallery_images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {campaign.gallery_images.map((img, i) => (
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
                  <p>{campaign.description}</p>
                </div>
              </div>

              {/* Commission & Category Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm text-green-700 mb-1">Commission</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 flex items-center gap-2">
                    {campaign.commission_type === 'percentage' ? (
                      <>
                        <Percent className="w-5 h-5" />
                        {campaign.commission_rate}%
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5" />
                        KES {campaign.commission_fixed_amount || campaign.commission_rate}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-green-600 mt-1 capitalize">
                    {campaign.commission_type}
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-xs sm:text-sm text-blue-700 mb-1">Category</div>
                  <div className="text-base sm:text-lg font-bold text-blue-900 mt-2">
                    {campaign.product_category}
                  </div>
                </div>

                {campaign.product_count > 0 && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="text-xs sm:text-sm text-purple-700 mb-1">Products</div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {campaign.product_count}
                    </div>
                    <button
                      onClick={() => {
                        onBrowseProducts(campaign._id);
                        onClose();
                      }}
                      className="text-xs text-purple-700 hover:underline mt-1"
                    >
                      Browse products →
                    </button>
                  </div>
                )}

                {campaign.product_price && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="text-xs sm:text-sm text-purple-700 mb-1">Product Price</div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {campaign.currency || 'KES'} {campaign.product_price.toFixed(2)}
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
                      {campaign.start_date 
                        ? new Date(campaign.start_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Not set'}
                    </span>
                  </div>
                  {campaign.end_date && (
                    <div>
                      <span className="text-gray-600">End Date:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(campaign.end_date).toLocaleDateString('en-US', { 
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
              {campaign.terms_and_conditions && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-900 text-sm sm:text-base">Terms & Conditions</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-yellow-800 whitespace-pre-wrap">
                    {campaign.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
              {myLinks.some(link => link.campaign_id === campaign._id && !link.product_id) ? (
                <button
                  onClick={() => {
                    const link = myLinks.find(l => l.campaign_id === campaign._id && !l.product_id);
                    if (link) {
                      onCopyLink(link.full_tracking_url);
                      onClose();
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
                    onGenerateLink(campaign._id);
                    onClose();
                  }}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <LinkIcon className="w-4 h-4" />
                  Get Campaign Link
                </button>
              )}
              {campaign.product_count > 0 && (
                <button
                  onClick={() => {
                    onBrowseProducts(campaign._id);
                    onClose();
                  }}
                  className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Browse Products
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

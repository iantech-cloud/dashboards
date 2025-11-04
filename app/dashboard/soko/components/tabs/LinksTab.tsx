// app/dashboard/soko/components/tabs/LinksTab.tsx
import { Download, LinkIcon, Copy, ExternalLink, Package, CheckCircle, XCircle } from 'lucide-react';
import { UserAffiliateLink } from '../types';

interface LinksTabProps {
  myLinks: UserAffiliateLink[];
  onCopyLink: (url: string) => void;
  exportToCSV: (data: any[], filename: string) => void;
  setActiveTab: (tab: 'campaigns' | 'products' | 'links' | 'performance' | 'payouts' | 'referrals') => void;
}

export default function LinksTab({ myLinks, onCopyLink, exportToCSV, setActiveTab }: LinksTabProps) {
  return (
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
                <div className="flex items-start gap-3 mb-3">
                  {link.product_image && (
                    <img
                      src={link.product_image}
                      alt={link.product_title || 'Product'}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                      {link.campaign_name}
                    </h3>
                    {link.product_title && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {link.product_title}
                      </p>
                    )}
                    {link.product_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mt-2">
                        <Package className="w-3 h-3" />
                        Product Link
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3 flex items-center gap-2">
                  <code className="text-xs sm:text-sm text-blue-600 flex-1 truncate break-all">
                    {link.full_tracking_url}
                  </code>
                  <button
                    onClick={() => onCopyLink(link.full_tracking_url)}
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
                      onClick={() => onCopyLink(link.short_tracking_url)}
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

            <div className="mt-3 flex justify-between items-center">
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
              
              {link.product_id && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Product Link
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
  );
}

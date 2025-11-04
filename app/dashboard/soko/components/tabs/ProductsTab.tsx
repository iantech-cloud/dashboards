import { Package, Search, Grid3x3, List, Star, Copy, Eye, ImageIcon, Loader2 } from 'lucide-react';
import { Product, UserAffiliateLink } from '../types';

interface ProductsTabProps {
  campaignProducts: Product[];
  loadingProducts: boolean;
  productSearchQuery: string;
  setProductSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  productsPage: number;
  productsTotalPages: number;
  selectedCampaignForProducts: string;
  myLinks: UserAffiliateLink[];
  onLoadCampaignProducts: (campaignId: string, page: number) => void;
  onViewProduct: (productId: string) => void;
  onCopyLink: (url: string) => void;
  onGenerateLink: (campaignId: string, productId?: string) => void;
  setActiveTab: (tab: 'campaigns' | 'products' | 'links' | 'performance' | 'payouts' | 'referrals') => void;
}

export default function ProductsTab({
  campaignProducts,
  loadingProducts,
  productSearchQuery,
  setProductSearchQuery,
  viewMode,
  setViewMode,
  productsPage,
  productsTotalPages,
  selectedCampaignForProducts,
  myLinks,
  onLoadCampaignProducts,
  onViewProduct,
  onCopyLink,
  onGenerateLink,
  setActiveTab
}: ProductsTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {campaignProducts.length === 0 && !loadingProducts ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base mb-4">No products loaded yet</p>
          <p className="text-xs sm:text-sm text-gray-500 mb-4">
            Browse a campaign to see its products
          </p>
          <button
            onClick={() => setActiveTab('campaigns')}
            className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition"
          >
            Browse Campaigns
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex-1 relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 text-gray-600'}`}
              >
                <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 text-gray-600'}`}
              >
                <List className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
              <p className="ml-3 text-gray-600">Loading products...</p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {campaignProducts.map(product => {
                  const hasLink = myLinks.some(link => link.product_id === product._id);
                  
                  return viewMode === 'grid' ? (
                    <div
                      key={product._id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {product.is_featured && (
                        <div className="bg-yellow-400 text-yellow-900 px-2 py-1 text-xs font-bold">
                          ⭐ FEATURED
                        </div>
                      )}

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      <div className="p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                          {product.title}
                        </h3>

                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              ${product.price_usd.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              KES {product.price_kes.toFixed(0)}
                            </div>
                          </div>
                          
                          {product.condition && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                              {product.condition}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {hasLink ? (
                            <button
                              onClick={() => {
                                const link = myLinks.find(l => l.product_id === product._id);
                                if (link) onCopyLink(link.full_tracking_url);
                              }}
                              className="w-full py-2 px-3 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Copy className="w-3 h-3" />
                              Copy Link
                            </button>
                          ) : (
                            <button
                              onClick={() => onViewProduct(product._id)}
                              className="w-full py-2 px-3 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                              <Eye className="w-3 h-3" />
                              View & Get Link
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={product._id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300 flex gap-4"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 flex-1">
                            {product.title}
                          </h3>
                          {product.is_featured && (
                            <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                          {product.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              ${product.price_usd.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              KES {product.price_kes.toFixed(0)}
                            </div>
                          </div>

                          {product.condition && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                              {product.condition}
                            </span>
                          )}

                          <div className="ml-auto flex gap-2">
                            {hasLink ? (
                              <button
                                onClick={() => {
                                  const link = myLinks.find(l => l.product_id === product._id);
                                  if (link) onCopyLink(link.full_tracking_url);
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Link
                              </button>
                            ) : (
                              <button
                                onClick={() => onViewProduct(product._id)}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                              >
                                <Eye className="w-3 h-3" />
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {productsTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => onLoadCampaignProducts(selectedCampaignForProducts, productsPage - 1)}
                    disabled={productsPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {productsPage} of {productsTotalPages}
                  </span>
                  <button
                    onClick={() => onLoadCampaignProducts(selectedCampaignForProducts, productsPage + 1)}
                    disabled={productsPage === productsTotalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

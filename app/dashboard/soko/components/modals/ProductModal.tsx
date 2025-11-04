import { X, Copy, LinkIcon, ExternalLink, ImageIcon, Loader2 } from 'lucide-react';
import { ProductDetails, UserAffiliateLink } from '../types';

interface ProductModalProps {
  product: ProductDetails;
  loading: boolean;
  myLinks: UserAffiliateLink[];
  onClose: () => void;
  onCopyLink: (url: string) => void;
  onGenerateLink: (campaignId: string, productId?: string) => void;
}

export default function ProductModal({
  product,
  loading,
  myLinks,
  onClose,
  onCopyLink,
  onGenerateLink
}: ProductModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            <p className="ml-3 text-gray-600">Loading product details...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-4">{product.title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-64 object-cover rounded-xl mb-4"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}

                {product.additional_images && product.additional_images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {product.additional_images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Additional ${i + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${product.price_usd.toFixed(2)}
                  </div>
                  <div className="text-lg text-gray-600">
                    KES {product.price_kes.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2">
                  {product.condition && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Condition</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{product.condition}</span>
                    </div>
                  )}

                  {product.availability && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Availability</span>
                      <span className={`text-sm font-medium capitalize ${
                        product.availability === 'in stock' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.availability}
                      </span>
                    </div>
                  )}

                  {product.manufacturer && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Manufacturer</span>
                      <span className="text-sm font-medium text-gray-900">{product.manufacturer}</span>
                    </div>
                  )}

                  {product.size && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Size</span>
                      <span className="text-sm font-medium text-gray-900">{product.size}</span>
                    </div>
                  )}

                  {product.delivery_time && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Delivery Time</span>
                      <span className="text-sm font-medium text-gray-900">{product.delivery_time}</span>
                    </div>
                  )}

                  {product.shipping && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Shipping</span>
                      <span className="text-sm font-medium text-gray-900">{product.shipping}</span>
                    </div>
                  )}
                </div>

                {product.category_name && (
                  <div className="pt-3 border-t border-gray-200">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      {product.category_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {(product.mpn || product.gtin) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Product Identifiers</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {product.mpn && (
                    <div>
                      <span className="text-gray-600">MPN:</span>
                      <span className="ml-2 font-medium text-gray-900">{product.mpn}</span>
                    </div>
                  )}
                  {product.gtin && (
                    <div>
                      <span className="text-gray-600">GTIN:</span>
                      <span className="ml-2 font-medium text-gray-900">{product.gtin}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
              {myLinks.some(link => link.product_id === product._id) ? (
                <button
                  onClick={() => {
                    const link = myLinks.find(l => l.product_id === product._id);
                    if (link) {
                      onCopyLink(link.full_tracking_url);
                      onClose();
                    }
                  }}
                  className="flex-1 py-3 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy My Product Link
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (product.campaign_id) {
                      onGenerateLink(product.campaign_id, product._id);
                    }
                  }}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  Get Product Link
                </button>
              )}
              <button
                onClick={() => window.open(product.deep_link, '_blank')}
                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on Store
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
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

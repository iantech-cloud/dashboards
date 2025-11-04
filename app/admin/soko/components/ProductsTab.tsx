// app/admin/soko/components/ProductsTab.tsx
import { useState, useEffect } from 'react';
import { Package, Upload, FileText, RefreshCw, Search, Eye, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAlibabaProducts } from '@/app/actions/admin/soko';

interface AdminStats {
  totalProducts: number;
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

interface Product {
  _id: string;
  product_id: string;
  title: string;
  category_name: string;
  price_usd: number;
  price_kes: number;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
  total_clicks: number;
  total_conversions: number;
  campaign: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  import_batch_id: string;
  created_at: string;
}

interface ProductsTabProps {
  stats: AdminStats;
  importLogs: ImportLog[];
  onRefresh: () => void;
  onShowUploadModal: () => void;
}

export default function ProductsTab({ stats, importLogs, onRefresh, onShowUploadModal }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const productsPerPage = 12;

  useEffect(() => {
    loadProducts();
  }, [currentPage, searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await getAlibabaProducts({
        search: searchQuery,
        page: currentPage,
        limit: productsPerPage
      });
      if (result.success) {
        setProducts(result.data.products);
        setTotalPages(result.data.pagination.totalPages);
        setTotalProducts(result.data.pagination.total);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const filteredImportLogs = importLogs.filter(log => 
    log.failed_imports > 0 || log.status === 'failed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onClick={onShowUploadModal}
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={loadProducts}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product._id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="aspect-square bg-gray-100 relative">
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/api/placeholder/300/300';
                }}
              />
              {product.is_featured && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                  FEATURED
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(product)}
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70 transition"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-gray-900 line-clamp-2 mb-2">{product.title}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-bold text-green-600">KES {product.price_kes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Clicks:</span>
                  <span>{product.total_clicks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversions:</span>
                  <span>{product.total_conversions}</span>
                </div>
                {product.campaign && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign:</span>
                    <span className="text-blue-600 font-medium">{product.campaign.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>No products found</p>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && products.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * productsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * productsPerPage, totalProducts)}
            </span>{' '}
            of <span className="font-medium">{totalProducts}</span> products
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 border border-gray-300 rounded-lg font-medium transition flex items-center gap-2 ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 rounded-lg font-medium transition ${
                      currentPage === pageNumber
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 border border-gray-300 rounded-lg font-medium transition flex items-center gap-2 ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Failed Imports */}
      {filteredImportLogs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">Failed Imports</h3>
          </div>
          <div className="space-y-3">
            {filteredImportLogs.map(log => (
              <div key={log._id} className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">{log.filename}</div>
                    <div className="text-sm text-red-700">
                      {log.failed_imports} failed imports • {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-900">
                    {log.successful_imports} / {log.total_rows}
                  </div>
                  <div className="text-xs text-red-700">successful</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Preview Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.title}
                    className="w-full rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = '/api/placeholder/400/400';
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{selectedProduct.title}</h4>
                    <p className="text-gray-600 text-sm">Product ID: {selectedProduct.product_id}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-medium">{selectedProduct.category_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price USD</p>
                      <p className="font-medium">${selectedProduct.price_usd.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price KES</p>
                      <p className="font-medium text-green-600">KES {selectedProduct.price_kes.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className={`font-medium ${selectedProduct.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedProduct.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="font-bold text-gray-900 mb-2">Performance</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Clicks</p>
                        <p className="font-medium">{selectedProduct.total_clicks}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Conversions</p>
                        <p className="font-medium">{selectedProduct.total_conversions}</p>
                      </div>
                    </div>
                  </div>

                  {selectedProduct.campaign && (
                    <div className="border-t pt-4">
                      <h5 className="font-bold text-gray-900 mb-2">Campaign</h5>
                      <p className="text-blue-600 font-medium">{selectedProduct.campaign.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

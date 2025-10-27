// app/admin/soko/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createCampaign } from '@/app/actions/admin/soko';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    campaign_type: 'promotional' as 'cj_affiliate' | 'amazon' | 'promotional' | 'custom',
    affiliate_network: '',
    base_affiliate_link: '',
    featured_image: '',
    banner_image: '',
    commission_type: 'percentage' as 'percentage' | 'fixed' | 'tiered',
    commission_rate: 10,
    commission_fixed_amount: 0,
    product_category: '',
    product_price: 0,
    currency: 'KES',
    status: 'draft' as 'draft' | 'active' | 'paused' | 'expired' | 'archived',
    start_date: '',
    end_date: '',
    is_featured: false,
    sort_order: 0,
    min_user_level: 0,
    require_activation: true,
    require_verification: true,
    allowed_user_tiers: [] as string[],
    max_participants: undefined as number | undefined,
    terms_and_conditions: '',
    meta_title: '',
    meta_description: '',
    tags: [] as string[],
    // CJ Affiliate specific fields
    cj_advertiser_id: '',
    cj_publisher_id: '',
    cj_site_id: '',
    cj_campaign_id: '',
    cj_api_key: '',
    cj_access_token: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createCampaign(formData);
      if (result.success) {
        router.push('/admin/soko');
      } else {
        alert(result.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleArrayChange = (field: string, value: string) => {
    const values = value.split(',').map(v => v.trim()).filter(v => v);
    setFormData(prev => ({
      ...prev,
      [field]: values
    }));
  };

  // Common affiliate networks
  const affiliateNetworks = [
    { value: '', label: 'Select Network' },
    { value: 'CJ Affiliate', label: 'CJ Affiliate' },
    { value: 'Amazon Associates', label: 'Amazon Associates' },
    { value: 'ShareASale', label: 'ShareASale' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Rakuten Advertising', label: 'Rakuten Advertising' },
    { value: 'Awin', label: 'Awin' },
    { value: 'FlexOffers', label: 'FlexOffers' },
    { value: 'Commission Junction', label: 'Commission Junction' },
    { value: 'Custom', label: 'Custom Network' }
  ];

  // Common product categories
  const productCategories = [
    'Electronics',
    'Fashion & Apparel',
    'Home & Garden',
    'Beauty & Personal Care',
    'Health & Wellness',
    'Sports & Outdoors',
    'Toys & Games',
    'Books & Media',
    'Food & Beverages',
    'Automotive',
    'Travel & Hospitality',
    'Financial Services',
    'Education',
    'Software & SaaS',
    'Business Services'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/soko"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
          <p className="text-gray-600 mt-1">Set up a new affiliate campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Amazon Electronics Deals"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Type *
              </label>
              <select
                name="campaign_type"
                value={formData.campaign_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="promotional">Promotional</option>
                <option value="cj_affiliate">CJ Affiliate</option>
                <option value="amazon">Amazon Associates</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Affiliate Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Affiliate Network *
              </label>
              <select
                name="affiliate_network"
                value={formData.affiliate_network}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {affiliateNetworks.map(network => (
                  <option key={network.value} value={network.value}>
                    {network.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Category *
              </label>
              <select
                name="product_category"
                value={formData.product_category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {productCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              {formData.product_category === 'other' && (
                <input
                  type="text"
                  name="product_category"
                  value={formData.product_category}
                  onChange={handleChange}
                  placeholder="Enter custom category"
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the campaign (displayed in listings)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the campaign..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Affiliate Link *
              </label>
              <input
                type="url"
                name="base_affiliate_link"
                value={formData.base_affiliate_link}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/affiliate-link"
              />
            </div>
          </div>
        </div>

        {/* CJ Affiliate Specific Fields */}
        {formData.affiliate_network === 'CJ Affiliate' && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <h2 className="text-xl font-bold text-gray-900 mb-6">CJ Affiliate Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advertiser ID
                </label>
                <input
                  type="text"
                  name="cj_advertiser_id"
                  value={formData.cj_advertiser_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ Advertiser ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publisher ID
                </label>
                <input
                  type="text"
                  name="cj_publisher_id"
                  value={formData.cj_publisher_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ Publisher ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site ID
                </label>
                <input
                  type="text"
                  name="cj_site_id"
                  value={formData.cj_site_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ Site ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign ID
                </label>
                <input
                  type="text"
                  name="cj_campaign_id"
                  value={formData.cj_campaign_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ Campaign ID"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  name="cj_api_key"
                  value={formData.cj_api_key}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ API Key"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  name="cj_access_token"
                  value={formData.cj_access_token}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="CJ Access Token"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> CJ Affiliate integration requires proper API configuration. 
                Make sure to enter valid credentials for commission tracking and reporting.
              </p>
            </div>
          </div>
        )}

        {/* Amazon Associates Specific Fields */}
        {formData.affiliate_network === 'Amazon Associates' && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Amazon Associates Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking ID
                </label>
                <input
                  type="text"
                  name="amazon_tracking_id"
                  value={formData.cj_advertiser_id} // Reusing field for Amazon
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Amazon Tracking ID (e.g., yourstore-20)"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Amazon Associates links should include your tracking ID in the URL.
                Ensure your base affiliate link includes the proper Amazon Associates parameters.
              </p>
            </div>
          </div>
        )}

        {/* Commission Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Commission Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Type *
              </label>
              <select
                name="commission_type"
                value={formData.commission_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="tiered">Tiered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.commission_type === 'percentage' ? 'Commission Rate (%) *' : 'Fixed Amount (KES) *'}
              </label>
              <input
                type="number"
                name={formData.commission_type === 'percentage' ? 'commission_rate' : 'commission_fixed_amount'}
                value={formData.commission_type === 'percentage' ? formData.commission_rate : formData.commission_fixed_amount}
                onChange={handleChange}
                required
                min="0"
                max={formData.commission_type === 'percentage' ? 100 : 100000}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.commission_type === 'percentage' ? '10%' : 'KES 100'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Price (KES)
              </label>
              <input
                type="number"
                name="product_price"
                value={formData.product_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campaign Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Campaign Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum User Level
              </label>
              <input
                type="number"
                name="min_user_level"
                value={formData.min_user_level}
                onChange={handleChange}
                min="0"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Participants
              </label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants || ''}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed User Tiers
              </label>
              <input
                type="text"
                value={formData.allowed_user_tiers.join(', ')}
                onChange={(e) => handleArrayChange('allowed_user_tiers', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="bronze, silver, gold (comma separated)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                name="terms_and_conditions"
                value={formData.terms_and_conditions}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Campaign terms and conditions..."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Feature this campaign
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="require_activation"
                checked={formData.require_activation}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Require user activation
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="require_verification"
                checked={formData.require_verification}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Require user verification
              </label>
            </div>
          </div>
        </div>

        {/* Media URLs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Media</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image URL
              </label>
              <input
                type="url"
                name="featured_image"
                value={formData.featured_image}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/featured.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image URL
              </label>
              <input
                type="url"
                name="banner_image"
                value={formData.banner_image}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/banner.jpg"
              />
            </div>
          </div>
        </div>

        {/* SEO & Metadata */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">SEO & Metadata</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <input
                type="text"
                name="meta_title"
                value={formData.meta_title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SEO meta title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => handleArrayChange('tags', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="affiliate, electronics, deals (comma separated)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                name="meta_description"
                value={formData.meta_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SEO meta description..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/admin/soko"
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  );
}

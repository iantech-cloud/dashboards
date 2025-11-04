// app/admin/soko/components/CampaignsTab.tsx
import { useState } from 'react';
import Link from 'next/link';
import { Search, Edit, Trash2, Eye, EyeOff, Plus, TrendingUp, Users, MousePointerClick } from 'lucide-react';
import { deleteCampaign, toggleCampaignStatus } from '@/app/actions/admin/soko';

interface Campaign {
  _id: string;
  name: string;
  slug: string;
  campaign_type: string;
  commission_type: 'percentage' | 'fixed';
  commission_rate: number;
  commission_fixed_amount: number;
  status: string;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  current_participants: number;
  product_count: number;
  created_at: string;
  is_featured: boolean;
  is_auto_created?: boolean;
}

interface CampaignsTabProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export default function CampaignsTab({ campaigns, onRefresh }: CampaignsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const result = await toggleCampaignStatus(campaignId, newStatus);
      if (result.success) onRefresh();
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const result = await deleteCampaign(campaignId);
      if (result.success) {
        onRefresh();
      } else {
        alert(result.message || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  // Safe commission display function
  const getCommissionDisplay = (campaign: Campaign) => {
    if (campaign.commission_type === 'percentage') {
      return {
        value: `${campaign.commission_rate || 0}%`,
        type: 'percentage'
      };
    } else {
      // Ensure commission_fixed_amount is a number and has a default value
      const fixedAmount = campaign.commission_fixed_amount || 0;
      return {
        value: `KES ${fixedAmount.toFixed(2)}`,
        type: 'fixed'
      };
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <Link
          href="/admin/soko/create"
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCampaigns.map(campaign => {
              const commission = getCommissionDisplay(campaign);
              
              return (
                <tr key={campaign._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {campaign.name}
                        {campaign.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">FEATURED</span>
                        )}
                        {campaign.is_auto_created && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">AUTO</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{campaign.slug}</div>
                      {campaign.product_count > 0 && (
                        <div className="text-xs text-purple-600 font-medium mt-1">
                          {campaign.product_count} products
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                      {campaign.campaign_type?.replace('_', ' ') || 'custom'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-green-600">
                        {commission.value}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {commission.type}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-gray-400" />
                        <span>{(campaign.total_clicks || 0).toLocaleString()} clicks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{campaign.total_conversions || 0} conversions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{campaign.current_participants || 0} affiliates</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      campaign.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {(campaign.status || 'draft').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/soko/${campaign._id}/edit`} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Edit">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(campaign._id, campaign.status)}
                        className={`p-2 rounded transition ${campaign.status === 'active' ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {campaign.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteCampaign(campaign._id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No campaigns found</p>
          </div>
        )}
      </div>
    </div>
  );
}

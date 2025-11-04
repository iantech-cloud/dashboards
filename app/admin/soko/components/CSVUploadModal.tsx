// app/admin/soko/components/CSVUploadModal.tsx
import { useRef, useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { uploadAndProcessCSV } from '@/app/actions/admin/soko';

interface Campaign {
  _id: string;
  name: string;
  status: string;
}

interface CSVUploadModalProps {
  campaigns: Campaign[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CSVUploadModal({ campaigns, onClose, onSuccess }: CSVUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [campaignMetadata, setCampaignMetadata] = useState({
    name: '',
    description: '',
    commission_rate: 10,
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_fixed_amount: 0
  });
  const [createNewCampaign, setCreateNewCampaign] = useState(false);

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!createNewCampaign && !selectedCampaign) {
      alert('Please select a campaign first');
      return;
    }

    if (createNewCampaign && !campaignMetadata.name) {
      alert('Please enter campaign name');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      setUploadingCSV(true);
      setUploadProgress('Reading file...');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target?.result as string;
        
        setUploadProgress('Uploading and processing...');
        
        const result = await uploadAndProcessCSV({
          csvContent,
          filename: file.name,
          campaignMetadata: createNewCampaign ? campaignMetadata : undefined,
          batchSize: 50
        });

        if (result.success) {
          setUploadProgress(`Success! ${result.data.successful} products imported, ${result.data.failed} failed.`);
          setTimeout(() => {
            onClose();
            setUploadProgress('');
            setSelectedCampaign('');
            setCreateNewCampaign(false);
            onSuccess();
          }, 3000);
        } else {
          setUploadProgress(`Error: ${result.message}`);
        }
      };

      reader.onerror = () => {
        setUploadProgress('Error reading file');
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadProgress('Error uploading file');
    } finally {
      setUploadingCSV(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'draft');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Alibaba Products CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Campaign Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!createNewCampaign}
                onChange={() => setCreateNewCampaign(false)}
                className="text-blue-600"
              />
              <span className="font-medium text-blue-900">Use Existing Campaign</span>
            </label>
            
            {!createNewCampaign && (
              <div className="mt-3">
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a campaign...</option>
                  {activeCampaigns.map(campaign => (
                    <option key={campaign._id} value={campaign._id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={createNewCampaign}
                onChange={() => setCreateNewCampaign(true)}
                className="text-green-600"
              />
              <span className="font-medium text-green-900">Create New Campaign</span>
            </label>
            
            {createNewCampaign && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignMetadata.name}
                    onChange={(e) => setCampaignMetadata(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={campaignMetadata.description}
                    onChange={(e) => setCampaignMetadata(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter campaign description"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type</label>
                    <select
                      value={campaignMetadata.commission_type}
                      onChange={(e) => setCampaignMetadata(prev => ({ 
                        ...prev, 
                        commission_type: e.target.value as 'percentage' | 'fixed' 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {campaignMetadata.commission_type === 'percentage' ? 'Commission Rate (%)' : 'Fixed Amount (KES)'}
                    </label>
                    <input
                      type="number"
                      value={campaignMetadata.commission_type === 'percentage' ? campaignMetadata.commission_rate : campaignMetadata.commission_fixed_amount}
                      onChange={(e) => setCampaignMetadata(prev => ({ 
                        ...prev, 
                        [campaignMetadata.commission_type === 'percentage' ? 'commission_rate' : 'commission_fixed_amount']: parseFloat(e.target.value) 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                      step={campaignMetadata.commission_type === 'percentage' ? '0.1' : '1'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 mb-4">
                CSV file with product data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploadingCSV || (!createNewCampaign && !selectedCampaign) || (createNewCampaign && !campaignMetadata.name)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCSV || (!createNewCampaign && !selectedCampaign) || (createNewCampaign && !campaignMetadata.name)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingCSV ? 'Uploading...' : 'Select File'}
              </button>
            </div>
          </div>

          {uploadProgress && (
            <div className={`p-4 rounded-lg ${
              uploadProgress.includes('Success') ? 'bg-green-50 text-green-800' :
              uploadProgress.includes('Error') ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <p className="text-sm font-medium">{uploadProgress}</p>
            </div>
          )}

          {/* CSV Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Required CSV Columns:
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>id</strong> - Product ID</p>
              <p>• <strong>title</strong> - Product title</p>
              <p>• <strong>description</strong> - Product description</p>
              <p>• <strong>price</strong> or <strong>price_usd</strong> - Price in USD</p>
              <p>• <strong>image_url</strong> - Product image URL</p>
              <p>• <strong>deep_link</strong> - Product URL</p>
              <p>• <strong>category_name</strong> - Category</p>
              <p className="text-xs mt-2 text-blue-600">
                * Column names are case-insensitive
              </p>
            </div>
          </div>

          {/* Error Handling Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Import Errors:
            </h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>• Failed imports will be shown in the Products tab</p>
              <p>• Check for missing required columns</p>
              <p>• Ensure product IDs are unique</p>
              <p>• Verify image URLs are accessible</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
